package com.hjs.foodshare.upload.service;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.upload.dto.ImageUploadResponse;
import jakarta.persistence.*;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.*;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageUploadService {
    private final Path uploadPath;
    @PersistenceContext private EntityManager em;
    public ImageUploadService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        uploadPath = Path.of(uploadDir).toAbsolutePath().normalize();
    }
    @Transactional
    public ImageUploadResponse upload(MultipartFile file, Long ownerId) {
        if (ownerId == null) throw new BusinessException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요.");
        var user=em.find(com.hjs.foodshare.user.domain.User.class,ownerId,LockModeType.PESSIMISTIC_WRITE);
        if(user==null||!user.isAvailable())throw new BusinessException(HttpStatus.UNAUTHORIZED,"다시 로그인해주세요.");
        long total=em.createQuery("select count(i) from UploadedImage i where i.ownerId=:id",Long.class).setParameter("id",ownerId).getSingleResult();
        long recent=em.createQuery("select count(i) from UploadedImage i where i.ownerId=:id and i.createdAt>:since",Long.class).setParameter("id",ownerId).setParameter("since",java.time.LocalDateTime.now().minusDays(1)).getSingleResult();
        if(total>=500||recent>=50)throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,"사진은 하루 50장, 계정당 보관 500장까지 올릴 수 있어요. 사용하지 않는 사진은 자동 정리됩니다.");
        if (file == null || file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw invalid();
        Path target = null;
        try (var input = new MemoryCacheImageInputStream(file.getInputStream())) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            var reader = readers.next();
            BufferedImage decoded;
            try {
                reader.setInput(input, true, true);
                if (!Set.of("jpeg", "jpg", "png", "gif", "webp").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) throw invalid();
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > 40_000_000) throw invalid();
                var params = reader.getDefaultReadParam();
                int sample = Math.max(1, Math.max(width, height) / 1600);
                params.setSourceSubsampling(sample, sample, 0, 0);
                decoded = reader.read(0, params);
            } finally { reader.dispose(); }
            if (decoded == null) throw invalid();
            double scale = Math.min(1.0, 1600.0 / Math.max(decoded.getWidth(), decoded.getHeight()));
            var clean = new BufferedImage(Math.max(1, (int)(decoded.getWidth()*scale)), Math.max(1, (int)(decoded.getHeight()*scale)), BufferedImage.TYPE_INT_RGB);
            var graphics = clean.createGraphics();
            try {
                graphics.setColor(java.awt.Color.WHITE); graphics.fillRect(0, 0, clean.getWidth(), clean.getHeight());
                graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                graphics.drawImage(decoded, 0, 0, clean.getWidth(), clean.getHeight(), null);
            } finally { graphics.dispose(); }
            // Drop executable content, metadata, and user-supplied extensions.
            String filename = UUID.randomUUID() + ".jpg";
            Files.createDirectories(uploadPath); target = uploadPath.resolve(filename);
            var writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (var output = ImageIO.createImageOutputStream(target.toFile())) {
                writer.setOutput(output);
                var params = writer.getDefaultWriteParam();
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT); params.setCompressionQuality(0.85f);
                writer.write(null, new IIOImage(clean, null, null), params);
            } finally { writer.dispose(); }
            final Path written=target;
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){
                @Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)try{Files.deleteIfExists(written);}catch(IOException ignored){}}
            });
            var tracked=new UploadedImage(filename,ownerId);tracked.setFingerprint(ImageFingerprint.of(file));em.persist(tracked);em.flush();
            return new ImageUploadResponse("/uploads/" + filename, file.getOriginalFilename(), Files.size(target));
        } catch (IOException | IllegalArgumentException e) {
            if (target != null) try { Files.deleteIfExists(target); } catch (IOException ignored) {}
            throw invalid();
        }
    }
    public void requireOwned(String url, Long userId, String unchangedUrl) {
        if (url == null || url.isBlank() || Objects.equals(url, unchangedUrl)) return;
        if (!url.matches("/uploads/[a-f0-9-]{36}\\.jpg")) throw new BusinessException(HttpStatus.BAD_REQUEST, "사진을 다시 업로드해주세요.");
        var image = em.find(UploadedImage.class, url.substring("/uploads/".length()),LockModeType.PESSIMISTIC_READ);
        if (image == null || !image.getOwnerId().equals(userId)) throw new BusinessException(HttpStatus.FORBIDDEN, "내가 업로드한 사진만 사용할 수 있어요.");
    }
    public void deleteIfLocalUpload(String imageUrl) {
        // Reference-aware scheduled cleanup reclaims unused files after a two-day grace period.
    }
    @org.springframework.scheduling.annotation.Scheduled(cron="0 30 3 * * *",zone="Asia/Seoul")
    @Transactional
    public void cleanUnusedImages(){
        var old=em.createQuery("select i from UploadedImage i where i.createdAt<:cutoff order by coalesce(i.checkedAt,i.createdAt),i.filename",UploadedImage.class).setParameter("cutoff",java.time.LocalDateTime.now().minusDays(2)).setMaxResults(1000).getResultList();
        for(var img:old){
            em.refresh(img,LockModeType.PESSIMISTIC_WRITE);img.checked();
            String url="/uploads/"+img.getFilename();
            if(!img.getFilename().matches("[a-f0-9-]{36}\\.jpg"))continue;
            long references=em.createQuery("select count(p) from Post p where p.imageUrl=:url",Long.class).setParameter("url",url).getSingleResult()
                +em.createQuery("select count(u) from User u where u.profileImage=:url or u.profileImage like :suffix",Long.class).setParameter("url",url).setParameter("suffix","%"+url).getSingleResult()
                +em.createQuery("select count(f) from FridgeItem f where f.imageUrl=:url",Long.class).setParameter("url",url).getSingleResult()
                +em.createQuery("select count(m) from ChatMessage m where m.content like :url",Long.class).setParameter("url","%"+url+"%").getSingleResult();
            if(references==0){Path candidate=uploadPath.resolve(img.getFilename()).normalize();if(!candidate.getParent().equals(uploadPath))continue;try{Files.deleteIfExists(candidate);em.remove(img);}catch(IOException ignored){}}
        }
    }
    private BusinessException invalid() { return new BusinessException(HttpStatus.BAD_REQUEST, "10MB 이하의 JPEG·PNG·WebP·GIF 사진을 선택해주세요. 사진 크기는 4천만 화소 이하로 올려주세요."); }
}
