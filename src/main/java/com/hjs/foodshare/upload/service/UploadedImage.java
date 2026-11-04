package com.hjs.foodshare.upload.service;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="uploaded_images",indexes={@Index(name="idx_uploaded_owner_created",columnList="owner_id,created_at"),@Index(name="idx_uploaded_checked",columnList="checked_at")})
public class UploadedImage {
 @Id @Column(length=80) private String filename;
 @Column(nullable=false) private Long ownerId;
 @Column(length=64) private String fingerprint;
 public String getFingerprint(){return fingerprint;}
 public void setFingerprint(String value){fingerprint=value;}
 private LocalDateTime createdAt=LocalDateTime.now();
 private LocalDateTime checkedAt;
 public void checked(){checkedAt=LocalDateTime.now();}
 protected UploadedImage(){}
 public UploadedImage(String filename,Long ownerId){this.filename=filename;this.ownerId=ownerId;}
 public String getFilename(){return filename;}
 public Long getOwnerId(){return ownerId;}
}
