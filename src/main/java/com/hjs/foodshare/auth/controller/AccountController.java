package com.hjs.foodshare.auth.controller;
import com.hjs.foodshare.auth.service.AccountService;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/account")
public class AccountController {
 private final AccountService accounts;
 public AccountController(AccountService accounts){this.accounts=accounts;}
 public record Withdrawal(@NotBlank String password,boolean confirmed){}
 @DeleteMapping public Object withdraw(@AuthenticationPrincipal AuthUser user,@Valid @RequestBody Withdrawal request){
  if(!request.confirmed())throw new com.hjs.foodshare.global.exception.BusinessException(org.springframework.http.HttpStatus.BAD_REQUEST,"탈퇴 안내를 확인해주세요.");
  accounts.withdraw(user.userId(),request.password());return ApiResponse.ok("회원 탈퇴가 완료되었습니다.",null);
 }
}
