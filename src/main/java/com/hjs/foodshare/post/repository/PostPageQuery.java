package com.hjs.foodshare.post.repository;

import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.dto.PostSort;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class PostPageQuery {
    @PersistenceContext private EntityManager em;
    public record Result(List<Post> posts, long total) {}
    public Result search(PostType type, String keyword, Double radius, Double lat, Double lng,
                         boolean expiring, PostSort sort, Long userId, boolean marketOnly, int offset, int limit) {
        var params = new HashMap<String,Object>();
        var now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        params.put("today", now.toLocalDate());
        params.put("now", now);
        var expiration = "(case when p.postType=com.hjs.foodshare.post.domain.PostType.BUY and p.deadlineDate is not null"
                + " then cast(p.deadlineDate as LocalDate) else p.expirationDate end)";
        var where = new StringBuilder(" where p.deleted=false and coalesce(p.writer.suspended,false)=false and p.writer.withdrawnAt is null and p.status=com.hjs.foodshare.post.domain.PostStatus.OPEN and p.openFridgeValidUntil is null");
        where.append(" and not exists(select s.requestId from DemoSession s where s.privatePostId=p.id)");
        where.append(" and ").append(expiration).append(">=:today");
        where.append(" and (p.deadlineDate is null or p.deadlineDate>:now)");
        where.append(" and (not exists (select d.postId from DemoPost d where d.postId=p.id) or exists (select ds.id from DemoState ds where ds.id=1 and ds.enabled=true))");
        if (marketOnly) where.append(" and p.postType<>com.hjs.foodshare.post.domain.PostType.GROUP_BUY");
        if(type!=null){where.append(" and p.postType=:type");params.put("type",type);}
        if(keyword!=null && !keyword.isBlank()) {
            where.append(" and (lower(p.title) like :keyword or lower(p.ingredientName) like :keyword)");
            params.put("keyword","%"+keyword.trim().toLowerCase(Locale.ROOT)+"%");
        }
        if(userId!=null){where.append(" and not exists(select b.id from UserBlock b where ((b.blocker.id=p.writer.id and b.blockedUser.id=:viewer) or (b.blockedUser.id=p.writer.id and b.blocker.id=:viewer)))");params.put("viewer",userId);}
        if (expiring) {
            where.append(" and ").append(expiration).append("<=:soon");
            params.put("soon", now.toLocalDate().plusDays(3));
        }
        boolean coordinates=lat!=null && lng!=null && Double.isFinite(lat) && Double.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180;
        String distance="p.distanceKm";
        if(coordinates) {
            distance="(6371.0 * acos(least(1.0, greatest(-1.0, sin(radians(:lat))*sin(radians(round(p.latitude,2)))+cos(radians(:lat))*cos(radians(round(p.latitude,2)))*cos(radians(round(p.longitude,2)-:lng))))))";
        }
        if(radius!=null){
            if(!coordinates || !Double.isFinite(radius) || radius<0) where.append(" and 1=0");
            else {where.append(" and p.latitude is not null and p.longitude is not null and ").append(distance).append("<=:radius");params.put("radius",radius);params.put("lat",lat);params.put("lng",lng);}
        }
        String order=switch(sort==null?PostSort.LATEST:sort){
            case LATEST -> "p.createdAt desc";
            case EXPIRING_SOON -> expiration + " asc, p.createdAt desc";
            case DEADLINE -> "p.deadlineDate asc nulls last, p.createdAt desc";
            case PARTICIPATION -> "(1.0*p.currentParticipantCount/nullif(p.targetParticipantCount,0)) desc nulls last, p.createdAt desc";
            case FRESHNESS -> "p.writer.freshnessScore desc, p.createdAt desc";
            case PRICE_LOW -> "p.price asc nulls last, p.createdAt desc";
            case DISTANCE -> distance+" asc nulls last, p.createdAt desc";
        };
        var count=em.createQuery("select count(p) from Post p"+where,Long.class);
        params.forEach(count::setParameter);
        long total=count.getSingleResult();
        if(total==0 || offset>=total) return new Result(List.of(),total);
        if(sort==PostSort.DISTANCE && coordinates){params.put("lat",lat);params.put("lng",lng);}
        var query=em.createQuery("select p from Post p join fetch p.writer left join fetch p.ingredientAnalysis"+where+" order by "+order+", p.id desc",Post.class);
        params.forEach(query::setParameter);
        return new Result(query.setFirstResult(offset).setMaxResults(limit).getResultList(),total);
    }
}
