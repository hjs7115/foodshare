package com.hjs.foodshare.upload.service;
import org.springframework.web.multipart.MultipartFile;
public final class ImageFingerprint {
 private ImageFingerprint(){}
 public static String of(MultipartFile image){
  try{return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(image.getBytes()));}
  catch(java.io.IOException e){throw new com.hjs.foodshare.global.exception.BusinessException(org.springframework.http.HttpStatus.BAD_REQUEST,"사진을 읽을 수 없습니다.");}
  catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
 }
}
