package com.hjs.foodshare.post.repository;

import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostStatus;
import com.hjs.foodshare.post.domain.PostType;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findAllByDeletedFalseOrderByCreatedAtDesc();

    List<Post> findAllByWriterIdAndDeletedFalseOrderByCreatedAtDesc(Long writerId);

    long countByWriterIdAndDeletedFalse(Long writerId);

    long countByWriterIdAndPostTypeAndDeletedFalse(Long writerId, PostType postType);

    long countByDeletedFalse();

    long countByDeletedFalseAndStatus(PostStatus status);

    List<Post> findAllByDeletedFalseAndStatusAndExpirationDateBetween(
            PostStatus status,
            LocalDate startDate,
            LocalDate endDate
    );

    List<Post> findAllByDeletedFalseAndStatusAndDeadlineDateBefore(
            PostStatus status,
            LocalDate date
    );

    @Query("""
            select p
            from Post p
            where p.deleted = false
              and (:postType is null or p.postType = :postType)
              and (:keyword is null
                   or lower(p.title) like lower(concat('%', :keyword, '%'))
                   or lower(p.ingredientName) like lower(concat('%', :keyword, '%')))
            """)
    List<Post> searchPosts(
            @Param("postType") PostType postType,
            @Param("keyword") String keyword
    );
}
