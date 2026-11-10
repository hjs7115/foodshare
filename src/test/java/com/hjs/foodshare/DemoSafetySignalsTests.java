package com.hjs.foodshare;

import com.hjs.foodshare.demo.DemoSafetySignals;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DemoSafetySignalsTests {
    @Test void explicitDirectedHarassmentIsCountedButOrdinaryTradeLanguageIsNot() {
        assertTrue(DemoSafetySignals.unmistakableHarassment("야 병신아"));
        assertTrue(DemoSafetySignals.unmistakableHarassment("너랑 섹스 하자"));
        assertTrue(DemoSafetySignals.unmistakableHarassment("야한 사진 보내"));
        assertFalse(DemoSafetySignals.unmistakableHarassment("안녕하세요! 당근 아직 있나요?"));
        assertFalse(DemoSafetySignals.unmistakableHarassment("우유랑 계란도 나눔 가능할까요?"));
        assertFalse(DemoSafetySignals.unmistakableHarassment("욕설 표현의 뜻이 뭔가요?"));
        assertFalse(DemoSafetySignals.unmistakableHarassment("성교육 관련 질문이에요."));
        assertFalse(DemoSafetySignals.unmistakableHarassment("정말 감사해요. 다음에 또 거래해요!"));
    }

    @Test void foodAndKitchenGoodsAreBroadlyAccepted() {
        assertFalse(DemoSafetySignals.clearOffTopicText(
                "사과 나눔", "한 봉지 나눠요", "사과"));
        assertFalse(DemoSafetySignals.clearOffTopicText(
                "주방에서 쓸 수 있는 중고 노트북", "요리 레시피 기록용", "주방용품"));
        assertFalse(DemoSafetySignals.clearOffTopicText(
                "김치냉장고 사용 재료", "토마토 보관", "토마토"));
        assertTrue(DemoSafetySignals.clearOffTopicText(
                "코인 투자", "비트코인 투자 리딩 모집", "암호화폐"));
        assertTrue(DemoSafetySignals.clearOffTopicText(
                "중고 노트북 판매", "노트북 직거래", "노트북"));
    }
}
