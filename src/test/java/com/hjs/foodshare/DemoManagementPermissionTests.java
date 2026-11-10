package com.hjs.foodshare;
import com.hjs.foodshare.demo.*;
import com.hjs.foodshare.global.security.AuthUser;
import com.hjs.foodshare.global.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class DemoManagementPermissionTests {
 @Test void ordinaryAccountCannotListOrRestoreRestrictedAccounts(){
  var visibility=mock(DemoVisibility.class);var safety=mock(DemoSafetyService.class);
  var controller=new DemoController(visibility,mock(DemoSimulationService.class),safety);
  doThrow(new BusinessException(HttpStatus.FORBIDDEN,"관리자만 가능합니다.")).when(visibility).requireResetPermission(7L);
  var auth=new AuthUser(7L,"test@example.com","테스트");
  assertThrows(BusinessException.class,()->controller.restricted(auth));
  assertThrows(BusinessException.class,()->controller.restore(auth,8L));
  verifyNoInteractions(safety);
 }
}
