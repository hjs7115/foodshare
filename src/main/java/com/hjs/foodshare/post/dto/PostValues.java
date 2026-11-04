package com.hjs.foodshare.post.dto;
import com.hjs.foodshare.global.exception.BusinessException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.*;

public final class PostValues {
    private PostValues() {}
    private static BusinessException invalid(){return new BusinessException(HttpStatus.BAD_REQUEST,"금액·날짜의 형식과 범위를 확인해주세요.");}
    public static boolean negotiable(Object value){return value instanceof String s && java.util.Set.of("가격미정","희망가 협의","가격 협의").contains(s.strip());}
    public static int price(Object value){
        if(negotiable(value) || "무료나눔".equals(value) || "무료".equals(value))return 0;
        try{
            String s=String.valueOf(value).strip().replace(",","").replace("원","").strip();
            int number=new BigDecimal(s).intValueExact();
            if(number<0 || number>1_000_000_000)throw invalid();
            return number;
        }catch(ArithmeticException|NumberFormatException e){throw invalid();}
    }
    public static LocalDate expiration(Object value){
        try{
            LocalDate date=value instanceof LocalDate d?d:LocalDate.parse(String.valueOf(value));
            if(date.isBefore(LocalDate.now(ZoneId.of("Asia/Seoul"))))throw invalid();
            return date;
        }catch(java.time.format.DateTimeParseException e){throw invalid();}
    }
    public static LocalDateTime deadline(Object value){
        if(value==null || value.toString().isBlank())return null;
        if(value instanceof LocalDateTime d)return d;
        if(value instanceof LocalDate d)return d.atTime(23,0);
        String s=value.toString();
        try{return s.length()==10?LocalDate.parse(s).atTime(23,0):LocalDateTime.parse(s.length()==13?s+":00":s);}
        catch(java.time.format.DateTimeParseException e){throw invalid();}
    }
    public static void coordinates(Double lat,Double lng){
        if((lat==null)!=(lng==null) || (lat!=null&&(!Double.isFinite(lat)||!Double.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)))throw invalid();
    }
}
