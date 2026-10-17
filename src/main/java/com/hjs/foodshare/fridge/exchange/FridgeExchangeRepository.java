package com.hjs.foodshare.fridge.exchange;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.*;
public interface FridgeExchangeRepository extends JpaRepository<FridgeExchange,Long>{
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE) @Query("select e from FridgeExchange e where e.id=:id") Optional<FridgeExchange> lockById(@Param("id") Long id);
 @Query("select e from FridgeExchange e where e.offered.writer.id=:id or e.wanted.writer.id=:id order by e.createdAt desc") List<FridgeExchange> mine(@Param("id") Long id,Pageable page);
 @Query("select e from FridgeExchange e left join fetch e.trade t join fetch e.offered a join fetch a.writer join fetch e.wanted b join fetch b.writer where (a.writer.id=:id or b.writer.id=:id) and (e.status='PENDING' or (e.status='ACCEPTED' and t.status=com.hjs.foodshare.trade.domain.TradeRequestStatus.ACCEPTED)) order by e.createdAt desc") List<FridgeExchange> active(@Param("id") Long id);
 @Query("select count(e)>0 from FridgeExchange e where e.status='PENDING'  and ((e.offered.id=:a and e.wanted.id=:b) or (e.offered.id=:b and e.wanted.id=:a))") boolean duplicate(@Param("a") Long a,@Param("b") Long b);
 @Query("select count(e)>0 from FridgeExchange e where e.status='ACCEPTED' and (e.offered.id=:id or e.wanted.id=:id)") boolean reserved(@Param("id") Long id);
}
