# 시연 게시글 AI 분석 갱신 절차 (운영 DB 보호)

이 문서는 서버 데이터에서 시연 글의 분석 날짜가 지난 이유를 확인하기 위한 **조회 전용** 절차입니다.

## 중요한 원칙

- 기존 분석의 `analyzed_at`만 현재로 변경하면 **새로 AI가 분석한 것처럼 표시되는 잘못된 정보**가 됩니다. 그렇게 변경하지 않습니다.
- 실제 촬영일이 오래된 사진을 다시 AI에 전달하더라도 현재 식재료 상태를 확인할 수는 없습니다.
- 따라서 실제 시연 사진을 최근에 다시 촬영한 뒤, 분석 API로 **새 분석 결과**를 생성하고 시연 글에 연결해야 합니다.
- 이번 코드 변경은 **시연모드 활성화 시 기한이 지난 분석을 게시글 응답에서 숨기며** 실제 소비 가능 기한을 임의로 연장하지 않습니다.
- 운영 환경의 사용자 게시글·분석값·DB 전체를 일괄 수정하지 않습니다.

## 분석 대상 확인 (읽기 전용 MySQL)

아래 SQL은 `demo_posts`에 표시된 글만 조회합니다. `SELECT`만 실행합니다.

```sql
SELECT p.id AS post_id,
       p.title,
       p.image_url,
       p.expiration_date,
       a.id AS analysis_id,
       a.analyzed_at,
       a.estimated_consumption_days_max,
       DATE_ADD(a.analyzed_at, INTERVAL a.estimated_consumption_days_max DAY) AS estimated_end
FROM demo_posts d
JOIN posts p ON p.id = d.post_id
LEFT JOIN ingredient_analyses a ON a.id = p.ingredient_analysis_id
ORDER BY p.id;
```

시연 글이 22개인지, 사진 URL과 원본 분석이 있는지, 사진 촬영 시점과 구매일이 신뢰할 만한지 검토한 후 각각 갱신하세요.

DB 작업 전 MySQL 볼륨 및 SQL 덤프 백업을 따로 준비하고, 새 사진으로 분석이 성공한 뒤에만 분석 결과를 교체해야 합니다. 사용자가 요청하지 않은 대량 SQL UPDATE 또는 미검증 데이터 재작성은 하지 않습니다.

## 배포 검증

- 시연모드 ON: 최신순 전체 목록에서 나눔/판매가 구매희망보다 먼저 표시되는지 확인
- 시연모드 OFF: 원래 최신순과 일반 거래 요청 문구 유지 확인
- 시연 요청 자동 수락 뒤 채팅방 진입: 사용자 첫 메시지 전 AI 메시지 없음
- 첫 메시지 후 상대 답장, 채팅방 개설 시스템 문구가 화면에 붙어있지 않음
- 채팅 상단에 '거래 연습 · 자동 응답 상대' 표시
- 완료/평가/초기화, 기존 일반 거래 흐름에 회귀 없는지 확인
