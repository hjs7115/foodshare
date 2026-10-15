package com.hjs.foodshare.meal;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.fridge.domain.FridgeItem;
import com.hjs.foodshare.global.exception.BusinessException;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
@Service
public class MealService {
 public record Suggestion(MealCatalog.Recipe recipe,List<String> available,List<String> missing,List<String> priority,List<Long> fridgeItemIds) {}
 public record Result(List<Suggestion> meals,String mode,List<String> excludedExpired) {}
 private final FridgeItemRepository fridge;private final MealCatalog catalog;private final MealAiClient ai;
 private final Map<Long,Long> lastAi=new HashMap<>();
 public MealService(FridgeItemRepository fridge,MealCatalog catalog,MealAiClient ai){this.fridge=fridge;this.catalog=catalog;this.ai=ai;}
 private synchronized boolean allowAi(Long userId){
  long now=System.currentTimeMillis();lastAi.entrySet().removeIf(e->now-e.getValue()>60000);
  if(lastAi.size()>=256 || now-lastAi.getOrDefault(userId,0L)<30000)return false;
  lastAi.put(userId,now);return true;
 }
 public Result recommend(Long userId,MealRequest request) {
  var owned=fridge.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(userId);
  var ids=new HashSet<>(request.fridgeItemIds());
  if(!owned.stream().map(FridgeItem::getId).collect(Collectors.toSet()).containsAll(ids))throw new BusinessException(HttpStatus.NOT_FOUND,"냉장고 재료를 다시 확인해주세요.");
  LocalDate today=LocalDate.now(ZoneId.of("Asia/Seoul"));
  var selected=owned.stream().filter(i->ids.contains(i.getId())).toList();
  var expired=selected.stream().filter(i->i.getExpiryDate().isBefore(today)).toList();
  var usable=selected.stream().filter(i->!i.getExpiryDate().isBefore(today)).toList();
  Set<String> available=usable.stream().map(i->MealCatalog.canonical(i.getName())).collect(Collectors.toSet());
  request.ingredients().stream().map(MealCatalog::canonical).forEach(available::add);
  Set<String> soon=usable.stream().filter(i->!i.getExpiryDate().isAfter(today.plusDays(3))).map(i->MealCatalog.canonical(i.getName())).collect(Collectors.toSet());
  Function<MealCatalog.Recipe,Suggestion> describe=r->{
   var names=r.ingredients().stream().map(MealCatalog.Ingredient::name).toList();
   var have=names.stream().filter(n->available.contains(MealCatalog.canonical(n))).toList();
   var missing=names.stream().filter(n->!available.contains(MealCatalog.canonical(n))).toList();
   var priority=names.stream().filter(n->soon.contains(MealCatalog.canonical(n))).toList();
   var matched=usable.stream().filter(i->names.stream().map(MealCatalog::canonical).anyMatch(n->n.equals(MealCatalog.canonical(i.getName())))).map(FridgeItem::getId).toList();
   return new Suggestion(r,have,missing,priority,matched);

  };
  var candidates=catalog.all().stream().filter(r->r.minutes()<=request.maxMinutes()).map(describe).filter(s->available.isEmpty() || (!s.available().isEmpty() && s.missing().size()<=2))
    .sorted(Comparator.<Suggestion>comparingInt(s->s.missing().size()).thenComparing(Comparator.comparingInt((Suggestion s)->s.priority().size()).reversed()).thenComparingInt(s->s.recipe().minutes()))
    .limit(12).toList();
  List<Suggestion> result=new ArrayList<>(candidates);String mode="BASIC";
  if(allowAi(userId)){
   mode="FALLBACK";
   var generated=ai.generate(available,soon,request.maxMinutes(),request.preference());
   var valid=generated.stream().filter(r->MealAiClient.validRecipe(r,request.maxMinutes())).limit(3).map(describe).toList();
   if(!valid.isEmpty()){result=new ArrayList<>(valid);mode="AI";}
  } else mode="FALLBACK";
  return new Result(result.stream().limit(3).toList(),mode,expired.stream().map(FridgeItem::getName).toList());
 }
}
