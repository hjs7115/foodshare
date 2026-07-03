package com.hjs.foodshare.fridge.service;

import com.hjs.foodshare.fridge.domain.FridgeItem;
import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.fridge.dto.FridgeItemResponse;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FridgeItemService {

    private final FridgeItemRepository fridgeItemRepository;
    private final UserRepository userRepository;

    public FridgeItemService(FridgeItemRepository fridgeItemRepository, UserRepository userRepository) {
        this.fridgeItemRepository = fridgeItemRepository;
        this.userRepository = userRepository;
    }

    public List<FridgeItemResponse> getItems(Long userId) {
        getUser(userId);
        return fridgeItemRepository.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(userId)
                .stream()
                .map(FridgeItemResponse::from)
                .toList();
    }

    @Transactional
    public FridgeItemResponse createItem(Long userId, FridgeItemRequest request) {
        User user = getUser(userId);
        FridgeItem item = FridgeItem.create(
                user,
                request.nameValue(),
                request.amountValue(),
                request.expiryDate(),
                request.storagePlaceValue(),
                request.memoValue()
        );
        return FridgeItemResponse.from(fridgeItemRepository.save(item));
    }

    @Transactional
    public FridgeItemResponse updateItem(Long userId, Long itemId, FridgeItemRequest request) {
        FridgeItem item = getOwnedItem(userId, itemId);
        item.update(
                request.nameValue(),
                request.amountValue(),
                request.expiryDate(),
                request.storagePlaceValue(),
                request.memoValue()
        );
        return FridgeItemResponse.from(item);
    }

    @Transactional
    public void deleteItem(Long userId, Long itemId) {
        fridgeItemRepository.delete(getOwnedItem(userId, itemId));
    }

    private FridgeItem getOwnedItem(Long userId, Long itemId) {
        getUser(userId);
        return fridgeItemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Fridge item not found."));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
