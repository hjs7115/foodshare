package com.hjs.foodshare.meal;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service @Transactional(readOnly=true)
public class MealLibraryService {
 @PersistenceContext EntityManager em;
 private final ObjectMapper mapper;
 public MealLibraryService(ObjectMapper mapper){this.mapper=mapper;}
 public record Row(Long id,MealCatalog.Recipe recipe,boolean favorite,LocalDateTime cookedAt){}
 public List<Row> list(Long user){return em.createQuery("select m from SavedMeal m where m.userId=:user order by m.updatedAt desc",SavedMeal.class).setParameter("user",user).setMaxResults(150).getResultList().stream().map(this::view).toList();}
 private Row view(SavedMeal m){try{return new Row(m.id,mapper.readValue(m.recipeJson,MealCatalog.Recipe.class),m.favorite,m.cookedAt);}catch(Exception e){throw new IllegalStateException("Stored recipe is invalid",e);}}
 @Transactional public Row save(Long user,MealCatalog.Recipe recipe,boolean cooked){
  validate(recipe);
  if(em.find(User.class,user,LockModeType.PESSIMISTIC_WRITE)==null)throw error("다시 로그인해주세요.");
  try{
   // The same recipe can be saved or cooked repeatedly without duplicate entries.
   var normalized=new MealCatalog.Recipe("saved",recipe.title(),recipe.minutes(),recipe.servings(),recipe.ingredients(),recipe.basics(),recipe.steps(),List.of());
   String json=mapper.writeValueAsString(normalized);
   String key=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.getBytes(StandardCharsets.UTF_8)));
   var existing=em.createQuery("select m from SavedMeal m where m.userId=:user and m.recipeKey=:key",SavedMeal.class).setParameter("user",user).setParameter("key",key).getResultList();
   SavedMeal meal=existing.isEmpty()?new SavedMeal():existing.getFirst();
   if(meal.id==null){if(list(user).size()>=150)throw error("보관함이 가득 찼어요. 이전 기록을 정리해주세요.");meal.userId=user;meal.recipeKey=key;meal.recipeJson=json;em.persist(meal);}
   meal.updatedAt=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
   if(cooked)meal.cookedAt=meal.updatedAt;else meal.favorite=true;
   em.flush();return view(meal);
  }catch(BusinessException e){throw e;}catch(Exception e){throw new IllegalStateException("Cannot save recipe",e);}
 }
 @Transactional public void delete(Long user,Long id){var m=em.find(SavedMeal.class,id);if(m==null||!user.equals(m.userId))throw new BusinessException(HttpStatus.NOT_FOUND,"기록을 찾지 못했어요.");em.remove(m);}
 private void validate(MealCatalog.Recipe r){
  if(r==null||bad(r.title(),100)||r.minutes()<1||r.minutes()>600||r.servings()<1||r.servings()>30||r.ingredients()==null||r.ingredients().isEmpty()||r.ingredients().size()>30||r.basics()==null||r.basics().size()>20||r.steps()==null||r.steps().isEmpty()||r.steps().size()>30)throw error("레시피 정보를 확인해주세요.");
  for(var i:r.ingredients())if(i==null||bad(i.name(),100)||bad(i.amount(),100))throw error("재료 정보를 확인해주세요.");
  for(var i:r.basics())if(i==null||bad(i.name(),100)||bad(i.amount(),100))throw error("양념 정보를 확인해주세요.");
  if(r.steps().stream().anyMatch(s->bad(s,1000)))throw error("조리 순서를 확인해주세요.");
 }
 private boolean bad(String s,int max){return s==null||s.isBlank()||s.length()>max;}
 private BusinessException error(String m){return new BusinessException(HttpStatus.BAD_REQUEST,m);}
}
