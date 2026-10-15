package com.hjs.foodshare.meal;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Component;
@Component
public class MealCatalog {
 public record Ingredient(String name, String amount) {}
 public record Recipe(String id, String title, int minutes, int servings, List<Ingredient> ingredients, List<Ingredient> basics, List<String> steps, List<String> tags) {}
 private final List<Recipe> recipes;
 public MealCatalog(ObjectMapper mapper) throws java.io.IOException {
  try(var in=getClass().getResourceAsStream("/meals/recipes.json")) { recipes=List.copyOf(mapper.readValue(in,new TypeReference<List<Recipe>>(){})); }
 }
 public List<Recipe> all(){return recipes;}
 public static String canonical(String name) {
  String s=name==null?"":name.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
  return switch(s) {
   case "달걀", "유정란", "달걀(계란)" -> "계란";
   case "흰쌀밥", "쌀밥", "즉석밥", "햇반" -> "밥";
   case "부침용두부", "찌개용두부" -> "두부";
   case "참치캔", "통조림참치" -> "참치";
   case "배추김치", "포기김치" -> "김치";
   case "새송이버섯", "느타리버섯", "팽이버섯", "표고버섯", "양송이버섯" -> "버섯";
   default -> s;
  };
 }
}
