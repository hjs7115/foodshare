package com.hjs.foodshare;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.demo.DemoMeetupService;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DemoMeetupServiceTests {
    @Test void onlyUserPlaceQuestionsTriggerLocationLookup() {
        assertTrue(DemoMeetupService.asksForMeetingPlace(
                "거래 위치: 단월동 시연 위치\n최근 대화:\n요청자: 어디서 보실래요?"));
        assertTrue(DemoMeetupService.asksForMeetingPlace(
                "게시글 작성자: 만날 장소를 정할까요?"));
        assertFalse(DemoMeetupService.asksForMeetingPlace(
                "거래 위치: 단월동 시연 위치\n최근 대화:\n요청자: 내일 3시 괜찮으세요?"));
        assertFalse(DemoMeetupService.asksForMeetingPlace(
                "요청자: 어디서 볼까요?\n게시글 작성자: 네, 좋습니다."));
    }

    @Test void usesOnlyActualReturnedPlacesAndPrefersNearbyRecognizableShops() {
        List<DemoMeetupService.Place> candidates = List.of(
                new DemoMeetupService.Place("개인카페", "CE7", 250),
                new DemoMeetupService.Place("GS25 충주점", "CS2", 270),
                new DemoMeetupService.Place("저녁식당", "FD6", 390));
        assertEquals("GS25 충주점 앞에서 만나실래요? 찾기 쉬울 것 같아요.",
                DemoMeetupService.choose(candidates, "요청자: 어디서 보실래요?"));
        assertEquals("개인카페 앞에서 만나실래요? 찾기 쉬울 것 같아요.",
                DemoMeetupService.choose(candidates, "요청자: 카페에서 만나면 좋겠어요. 어디서 볼까요?"));
        assertFalse(DemoMeetupService.choose(List.of(), "요청자: 어디서 보실래요?")
                .contains("단월동 시연"));
    }

    @Test void missingRestKeyNeverInventsNamedLandmark() {
        var service = new DemoMeetupService(new ObjectMapper(), "");
        assertNull(service.suggest("요청자: 가격이 얼마예요?", new DemoMeetupService.Point(36.9, 127.9)));
        assertEquals("근처 편의점이나 카페 앞에서 만나면 찾기 편할 것 같아요. 편하신 장소가 있을까요?",
                service.suggest("요청자: 어디서 보실래요?", new DemoMeetupService.Point(36.9, 127.9)));
        assertEquals("근처 편의점이나 카페 앞에서 만나면 찾기 편할 것 같아요. 편하신 장소가 있을까요?",
                service.suggest("요청자: 장소 어디가 좋으세요?", null));
    }
}
