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
            em.persist(new UploadedImage(filename, ownerId)); em.flush();
            return new ImageUploadResponse("/uploads/" + filename, file.getOriginalFilename(), Files.size(target));
        } catch (IOException | IllegalArgumentException e) {
            if (target != null) try { Files.deleteIfExists(target); } catch (IOException ignored) {}
            throw invalid();
        }
    }
    public void requireOwned(String url, Long userId, String unchangedUrl) {
        if (url == null || url.isBlank() || Objects.equals(url, unchangedUrl)) return;
        if (!url.matches("/uploads/[a-f0-9-]{36}\\.jpg")) throw new BusinessException(HttpStatus.BAD_REQUEST, "사진을 다시 업로드해주세요.");
        var image = em.find(UploadedImage.class, url.substring("/uploads/".length()));
        if (image == null || !image.getOwnerId().equals(userId)) throw new BusinessException(HttpStatus.FORBIDDEN, "내가 업로드한 사진만 사용할 수 있어요.");
    }
    public void deleteIfLocalUpload(String imageUrl) {
        // Legacy posts/profiles can share URLs. Only an offline reference-aware cleanup may delete files.
    }
    private BusinessException invalid() { return new BusinessException(HttpStatus.BAD_REQUEST, "10MB 이하의 JPEG·PNG·WebP·GIF 사진을 선택해주세요. 사진 크기는 4천만 화소 이하로 올려주세요."); }
}
