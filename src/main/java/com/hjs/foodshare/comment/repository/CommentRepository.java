package com.hjs.foodshare.comment.repository;

import com.hjs.foodshare.comment.domain.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByPostIdOrderByCreatedAtAsc(Long postId);

    List<Comment> findAllByWriterIdOrderByCreatedAtDesc(Long writerId);

    long countByPostId(Long postId);

    long countByWriterId(Long writerId);
}
