package com.hjs.foodshare;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hjs.foodshare.comment.dto.CommentCreateRequest;
import com.hjs.foodshare.comment.service.CommentService;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.dto.PostCreateRequest;
import com.hjs.foodshare.post.service.PostService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CommentVisibilityTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostService postService;

    @Autowired
    private CommentService commentService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void commentWriterAndPostWriterCanBothSeeCreatedComment() {
        User postWriter = saveUser("comment_post_writer");
        User commentWriter = saveUser("comment_writer");
        Long postId = postService.createPost(postWriter.getId(), shareRequest("Comment visibility post")).postId();

        commentService.createComment(postId, commentWriter.getId(), new CommentCreateRequest("hello from requester"));

        var commentsForCommentWriter = commentService.getComments(postId, commentWriter.getId());
        var commentsForPostWriter = commentService.getComments(postId, postWriter.getId());

        assertEquals(1, commentsForCommentWriter.size());
        assertEquals(1, commentsForPostWriter.size());
        assertTrue(commentsForCommentWriter.get(0).isMine());
        assertEquals("hello from requester", commentsForPostWriter.get(0).content());
    }

    @Test
    void publicCommentLookupIgnoresInvalidBearerToken() throws Exception {
        User postWriter = saveUser("comment_public_writer");
        User commentWriter = saveUser("comment_public_commenter");
        Long postId = postService.createPost(postWriter.getId(), shareRequest("Public comment visibility post")).postId();

        commentService.createComment(postId, commentWriter.getId(), new CommentCreateRequest("visible with invalid token"));

        mockMvc.perform(get("/api/posts/{postId}/comments", postId)
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("visible with invalid token")));
    }

    private User saveUser(String suffix) {
        return userRepository.save(User.create(
                "User " + suffix,
                "nick_" + suffix,
                suffix + "@foodshare.test",
                "{noop}password",
                "010-" + Math.abs(suffix.hashCode() % 9000 + 1000) + "-" + Math.abs(suffix.hashCode() % 9000 + 1000),
                "Seoul"
        ));
    }

    private PostCreateRequest shareRequest(String title) {
        return new PostCreateRequest(
                PostType.SHARE,
                title,
                "Apple",
                "1 box",
                0,
                "Seoul",
                0.0,
                37.5,
                127.0,
                LocalDate.now().plusDays(5),
                null,
                "share",
                null,
                null,
                null
        );
    }
}
