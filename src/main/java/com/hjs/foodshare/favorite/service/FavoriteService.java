package com.hjs.foodshare.favorite.service;

import com.hjs.foodshare.favorite.domain.Favorite;
import com.hjs.foodshare.favorite.dto.FavoriteResponse;
import com.hjs.foodshare.favorite.repository.FavoriteRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.dto.PostResponse;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.review.repository.ReviewRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;

    public FavoriteService(FavoriteRepository favoriteRepository, PostRepository postRepository, UserRepository userRepository,
                           ReviewRepository reviewRepository) {
        this.favoriteRepository = favoriteRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional
    public FavoriteResponse addFavorite(Long postId, Long userId) {
        Post post = getActivePost(postId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));

        if (!favoriteRepository.existsByPostIdAndUserId(postId, userId)) {
            favoriteRepository.save(Favorite.create(post, user));
        }
        return response(postId, true);
    }

    @Transactional
    public FavoriteResponse removeFavorite(Long postId, Long userId) {
        getActivePost(postId);
        favoriteRepository.deleteByPostIdAndUserId(postId, userId);
        return response(postId, false);
    }

    public FavoriteResponse getFavoriteStatus(Long postId, Long userId) {
        getActivePost(postId);
        return response(postId, favoriteRepository.existsByPostIdAndUserId(postId, userId));
    }

    public List<PostResponse> getMyFavorites(Long userId) {
        return favoriteRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(favorite -> !favorite.getPost().isDeleted())
                .map(favorite -> PostResponse.from(
                        favorite.getPost(),
                        userId,
                        0,
                        favoriteRepository.countByPostId(favorite.getPost().getId()),
                        reviewRepository.averageRatingByTargetUserId(favorite.getPost().getWriter().getId()),
                        true
                ))
                .toList();
    }

    private FavoriteResponse response(Long postId, boolean favorite) {
        return new FavoriteResponse(postId, favorite, favorite, favoriteRepository.countByPostId(postId));
    }

    private Post getActivePost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
        if (post.isDeleted()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Post not found.");
        }
        return post;
    }
}
