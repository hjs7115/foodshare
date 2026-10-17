package com.hjs.foodshare.upload.service;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="uploaded_images")
public class UploadedImage {
 @Id @Column(length=80) private String filename;
 @Column(nullable=false) private Long ownerId;
 private LocalDateTime createdAt=LocalDateTime.now();
 protected UploadedImage(){}
 public UploadedImage(String filename,Long ownerId){this.filename=filename;this.ownerId=ownerId;}
 public Long getOwnerId(){return ownerId;}
}
