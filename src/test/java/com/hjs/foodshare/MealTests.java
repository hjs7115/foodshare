package com.hjs.foodshare;
import com.hjs.foodshare.meal.*;
import com.hjs.foodshare.fridge.domain.FridgeItem;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.global.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class MealTests {
 MealCatalog catalog;FridgeItemRepository fridge;MealAiClient ai;MealService service;
 LocalDate today=LocalDate.now(ZoneId.of("Asia/Seoul"));
 @BeforeEach void setup() throws Exception {catalog=new MealCatalog(new ObjectMapper());fridge=mock(FridgeItemRepository.class);ai=mock(MealAiClient.class);service=new MealService(fridge,catalog,ai);when(fridge.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(1L)).thenReturn(List.of());}
 FridgeItem item(long id,String name,int days){var u=User.create("t","t","t@example.com","p","01000000000","Seoul");var i=FridgeItem.create(u,name,"1개",today.plusDays(days),"냉장","");ReflectionTestUtils.setField(i,"id",id);return i;}
 @Test void countsIngredientsDeterministicallyAndPrioritizesSoon() {
  when(fridge.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(1L)).thenReturn(List.of(item(1,"두부",1),item(2,"달걀",5),item(3,"밥",5)));
  var result=service.recommend(1L,new MealRequest(List.of(1L,2L,3L),List.of(),30,""));
  var first=result.meals().getFirst();assertEquals("tofu-egg",first.recipe().id());assertTrue(first.missing().isEmpty());assertEquals(List.of("두부"),first.priority());assertEquals(3,first.fridgeItemIds().size());verify(ai).generate(anySet(),anySet(),anyInt(),any());
 }
 @Test void expiredItemsAreExcludedAndNotPresentedAsAvailable(){
  when(fridge.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(1L)).thenReturn(List.of(item(1,"계란",-1),item(2,"밥",0)));
  var result=service.recommend(1L,new MealRequest(List.of(1L,2L),List.of(),30,""));
  assertEquals(List.of("계란"),result.excludedExpired());assertTrue(result.meals().stream().noneMatch(m->m.available().contains("계란")));assertTrue(result.meals().stream().allMatch(m->!m.fridgeItemIds().contains(1L)));
 }
 @Test void anotherUsersIngredientIdsAreRejected(){assertThrows(BusinessException.class,()->service.recommend(1L,new MealRequest(List.of(99L),List.of(),30,"")));verifyNoInteractions(ai);}
 @Test void manualIngredientsWorkWithoutFridgeAndTimeLimitIsApplied(){
  var result=service.recommend(1L,new MealRequest(List.of(),List.of("달걀","밥","대파"),15,""));assertEquals("egg-rice",result.meals().getFirst().recipe().id());assertTrue(result.meals().stream().allMatch(m->m.recipe().minutes()<=15));assertTrue(result.meals().getFirst().fridgeItemIds().isEmpty());
 }
 @Test void generatedRecipesAreNotLimitedToCatalogAndInventoryIsServerComputed(){
  var duck=new MealCatalog.Recipe("ai-duck","오리 대파볶음",25,2,List.of(new MealCatalog.Ingredient("오리","300g"),new MealCatalog.Ingredient("대파","1대")),List.of(),List.of("재료를 손질합니다.","충분히 익힙니다."),List.of());
  when(ai.generate(anySet(),anySet(),anyInt(),any())).thenReturn(List.of(duck));
  var request=new MealRequest(List.of(),List.of("대파"),30,"오리 요리");
  var result=service.recommend(1L,request);assertEquals("AI",result.mode());assertEquals("오리 대파볶음",result.meals().getFirst().recipe().title());assertEquals(List.of("대파"),result.meals().getFirst().available());assertEquals(List.of("오리"),result.meals().getFirst().missing());
  assertEquals("FALLBACK",service.recommend(1L,request).mode());verify(ai,times(1)).generate(anySet(),anySet(),anyInt(),any());
 }
 @Test void unavailableAiReturnsUsableBasicRecipes(){var result=service.recommend(1L,new MealRequest(List.of(),List.of("밥"),30,"국물"));assertEquals("FALLBACK",result.mode());assertFalse(result.meals().isEmpty());}
 @Test void generatedRecipesWithInvalidTimeOrMissingStepsAreRejected(){
  var r=new MealCatalog.Recipe("x","요리",90,2,List.of(new MealCatalog.Ingredient("두부","1모")),List.of(),List.of(),List.of());assertFalse(MealAiClient.validRecipe(r,30));
  when(ai.generate(anySet(),anySet(),anyInt(),any())).thenReturn(List.of(r));assertEquals("FALLBACK",service.recommend(1L,new MealRequest(List.of(),List.of(),30,"두부")).mode());
 }
 @Test void ingredientsAreNotInferredFromSubstringOrRawRice(){assertNotEquals(MealCatalog.canonical("밥"),MealCatalog.canonical("쌀"));assertNotEquals(MealCatalog.canonical("감자"),MealCatalog.canonical("감자칩"));assertEquals("계란",MealCatalog.canonical(" 달걀 "));}
 @Test void catalogHasCompleteExplicitRecipes(){assertEquals(12,catalog.all().size());for(var r:catalog.all()){assertFalse(r.ingredients().isEmpty());assertFalse(r.basics().isEmpty());assertFalse(r.steps().isEmpty());assertEquals(2,r.servings());assertTrue(r.minutes()>0);assertTrue(r.ingredients().stream().allMatch(i->!i.name().isBlank()&&!i.amount().isBlank()));}}
}
