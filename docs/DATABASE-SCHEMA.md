# 운영 DB 스키마

2026-10-27 운영 MySQL의 information_schema에서 읽기 전용으로 확인한 구조입니다. 행 데이터·비밀 설정은 포함하지 않습니다.

## auth_attempts

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `varchar(64)` | NO | PRI |
| `attempts` | `int` | NO |  |
| `expires_at` | `datetime(6)` | YES | MUL |

## chat_messages

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `content` | `text` | NO |  |
| `created_at` | `datetime(6)` | NO |  |
| `system_message` | `bit(1)` | NO |  |
| `chat_room_id` | `bigint` | NO | MUL / FK → chat_rooms.id |
| `sender_id` | `bigint` | YES | MUL / FK → users.id |

## chat_room_members

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `joined_at` | `datetime(6)` | NO |  |
| `muted` | `bit(1)` | NO |  |
| `pinned` | `bit(1)` | NO |  |
| `unread_count` | `int` | NO |  |
| `chat_room_id` | `bigint` | NO | MUL / FK → chat_rooms.id |
| `user_id` | `bigint` | NO | MUL / FK → users.id |
| `left_at` | `datetime(6)` | YES |  |

## chat_rooms

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | NO |  |
| `group_room` | `bit(1)` | NO |  |
| `requester_muted` | `bit(1)` | NO |  |
| `requester_pinned` | `bit(1)` | NO |  |
| `requester_unread_count` | `int` | NO |  |
| `updated_at` | `datetime(6)` | NO |  |
| `writer_muted` | `bit(1)` | NO |  |
| `writer_pinned` | `bit(1)` | NO |  |
| `writer_unread_count` | `int` | NO |  |
| `requester_id` | `bigint` | NO | MUL / FK → users.id |
| `trade_request_id` | `bigint` | NO | UNI / FK → trade_requests.id |
| `writer_id` | `bigint` | NO | MUL / FK → users.id |
| `custom_name` | `varchar(100)` | YES |  |

## comments

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `content` | `text` | NO |  |
| `created_at` | `datetime(6)` | NO |  |
| `post_id` | `bigint` | NO | MUL / FK → posts.id |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## email_verifications

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `code` | `varchar(6)` | NO |  |
| `created_at` | `datetime(6)` | NO |  |
| `email` | `varchar(100)` | NO |  |
| `expires_at` | `datetime(6)` | NO |  |
| `used` | `bit(1)` | NO |  |
| `verified` | `bit(1)` | NO |  |

## favorites

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | YES |  |
| `post_id` | `bigint` | NO | MUL / FK → posts.id |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## fridge_exchanges

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `chat_room_id` | `bigint` | YES | 논리 참조 → chat_rooms |
| `created_at` | `datetime(6)` | NO | MUL |
| `status` | `varchar(20)` | NO |  |
| `offered_post_id` | `bigint` | NO | MUL / FK → posts.id |
| `trade_id` | `bigint` | YES | UNI / FK → trade_requests.id |
| `wanted_post_id` | `bigint` | NO | MUL / FK → posts.id |
| `cancel_requested_by` | `bigint` | YES | 논리 참조 → users |
| `meeting_at` | `datetime(6)` | YES |  |
| `meeting_confirmed` | `bit(1)` | YES |  |
| `meeting_place` | `varchar(100)` | YES |  |
| `meeting_proposed_by` | `bigint` | YES |  |

## fridge_items

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `amount` | `varchar(50)` | NO |  |
| `created_at` | `datetime(6)` | NO |  |
| `expiry_date` | `date` | NO |  |
| `memo` | `text` | YES |  |
| `name` | `varchar(100)` | NO |  |
| `storage_place` | `varchar(30)` | NO |  |
| `updated_at` | `datetime(6)` | NO |  |
| `user_id` | `bigint` | NO | MUL / FK → users.id |
| `share_confirmed_at` | `datetime(6)` | YES |  |
| `shared_post_id` | `bigint` | YES | UNI / FK → posts.id |
| `image_url` | `varchar(500)` | YES |  |

## ingredient_analyses

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `analysis_mode` | `varchar(20)` | NO |  |
| `analyzed_at` | `datetime(6)` | NO |  |
| `confidence_level` | `enum('HIGH','LOW','MEDIUM')` | NO |  |
| `consumed` | `bit(1)` | NO |  |
| `estimated_consumption_days_max` | `int` | NO |  |
| `estimated_consumption_days_min` | `int` | NO |  |
| `ingredient_name` | `varchar(100)` | NO |  |
| `model_version` | `varchar(50)` | NO |  |
| `open_status` | `enum('OPENED','UNKNOWN','UNOPENED')` | NO |  |
| `original_price` | `int` | YES |  |
| `price_policy_version` | `varchar(20)` | NO |  |
| `purchase_date` | `date` | YES |  |
| `quality_grade` | `enum('EXCELLENT','FAIR','GOOD','POOR')` | NO |  |
| `quality_reason` | `varchar(500)` | NO |  |
| `quantity` | `varchar(50)` | NO |  |
| `quick_sale_price` | `int` | YES |  |
| `recommended_price` | `int` | YES |  |
| `storage_method` | `enum('FROZEN','REFRIGERATED','ROOM_TEMPERATURE')` | NO |  |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## notifications

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | NO |  |
| `message` | `text` | NO |  |
| `is_read` | `bit(1)` | NO |  |
| `target_id` | `bigint` | YES |  |
| `target_type` | `varchar(50)` | YES |  |
| `title` | `varchar(100)` | NO |  |
| `type` | `varchar(50)` | NO |  |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## posts

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `content` | `text` | NO |  |
| `created_at` | `datetime(6)` | NO |  |
| `current_participant_count` | `int` | YES |  |
| `deadline_date` | `datetime(6)` | YES |  |
| `deleted` | `bit(1)` | NO | MUL |
| `distance_km` | `double` | NO |  |
| `expiration_date` | `date` | NO | MUL |
| `image_url` | `text` | YES |  |
| `ingredient_name` | `varchar(100)` | NO |  |
| `latitude` | `double` | YES | MUL |
| `longitude` | `double` | YES |  |
| `post_type` | `enum('BUY','GROUP_BUY','SALE','SHARE')` | NO | MUL |
| `price` | `int` | NO |  |
| `quantity` | `varchar(50)` | NO |  |
| `status` | `enum('CLOSED','OPEN')` | NO |  |
| `target_participant_count` | `int` | YES |  |
| `title` | `varchar(100)` | NO |  |
| `trade_location` | `varchar(100)` | NO |  |
| `user_id` | `bigint` | NO | MUL / FK → users.id |
| `ingredient_analysis_id` | `bigint` | YES | UNI / FK → ingredient_analyses.id |
| `open_fridge_valid_until` | `datetime(6)` | YES |  |

## push_retries

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `attempts` | `int` | NO |  |
| `body` | `varchar(2000)` | YES |  |
| `due_at` | `datetime(6)` | YES | MUL |
| `expires_at` | `datetime(6)` | YES |  |
| `target_id` | `bigint` | YES |  |
| `target_type` | `varchar(255)` | YES |  |
| `title` | `varchar(200)` | YES |  |
| `token_id` | `bigint` | YES | 논리 참조 → user_fcm_tokens |
| `type` | `varchar(80)` | YES |  |
| `user_id` | `bigint` | YES | 논리 참조 → users |

## push_subscriptions

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `auth` | `varchar(128)` | NO |  |
| `endpoint` | `varchar(512)` | NO | UNI |
| `p256dh` | `varchar(256)` | NO |  |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## refresh_tokens

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | NO |  |
| `expires_at` | `datetime(6)` | NO |  |
| `revoked` | `bit(1)` | NO |  |
| `token` | `varchar(120)` | NO | UNI |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## reports

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | NO |  |
| `description` | `text` | YES |  |
| `reason` | `varchar(100)` | NO |  |
| `reviewed_at` | `datetime(6)` | YES |  |
| `status` | `enum('PENDING','REJECTED','REVIEWED')` | NO |  |
| `target_id` | `bigint` | NO |  |
| `target_type` | `enum('COMMENT','POST','USER')` | NO |  |
| `reporter_id` | `bigint` | NO | MUL / FK → users.id |
| `target_user_id` | `bigint` | NO | MUL / FK → users.id |

## reviews

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `content` | `text` | YES |  |
| `created_at` | `datetime(6)` | NO |  |
| `rating` | `int` | NO |  |
| `reviewer_id` | `bigint` | NO | MUL / FK → users.id |
| `target_user_id` | `bigint` | NO | MUL / FK → users.id |
| `trade_request_id` | `bigint` | NO | MUL / FK → trade_requests.id |

## saved_meals

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `cooked_at` | `datetime(6)` | YES |  |
| `favorite` | `bit(1)` | NO |  |
| `recipe_json` | `text` | NO |  |
| `recipe_key` | `varchar(64)` | NO |  |
| `updated_at` | `datetime(6)` | YES |  |
| `user_id` | `bigint` | NO | MUL / 논리 참조 → users |

## shopping_items

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `amount` | `varchar(100)` | NO |  |
| `name` | `varchar(100)` | NO |  |
| `source` | `varchar(120)` | NO |  |
| `state` | `varchar(12)` | NO |  |
| `user_id` | `bigint` | NO | MUL / 논리 참조 → users |
| `week_start` | `date` | NO |  |
| `fridge_item_id` | `bigint` | YES | 논리 참조 → fridge_items |

## shopping_preferences

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `user_id` | `bigint` | NO | PRI / 논리 참조 → users |
| `shopping_day` | `int` | NO |  |
| `last_reminder_week` | `date` | YES |  |
| `reminder_enabled` | `bit(1)` | YES |  |
| `reminder_minute` | `int` | YES |  |

## trade_requests

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `completed_at` | `datetime(6)` | YES |  |
| `created_at` | `datetime(6)` | NO |  |
| `responded_at` | `datetime(6)` | YES |  |
| `status` | `enum('ACCEPTED','CANCELLED','COMPLETED','PENDING','REJECTED')` | NO |  |
| `post_id` | `bigint` | NO | MUL / FK → posts.id |
| `requester_id` | `bigint` | NO | MUL / FK → users.id |
| `exchange_description` | `varchar(300)` | YES |  |

## uploaded_images

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `filename` | `varchar(80)` | NO | PRI |
| `created_at` | `datetime(6)` | YES |  |
| `owner_id` | `bigint` | NO | 논리 참조 → users |

## user_blocks

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | NO |  |
| `blocked_user_id` | `bigint` | NO | MUL / FK → users.id |
| `blocker_id` | `bigint` | NO | MUL / FK → users.id |

## user_fcm_tokens

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `token` | `varchar(500)` | NO | UNI |
| `user_id` | `bigint` | NO | MUL / FK → users.id |

## users

| 컬럼 | 타입 | NULL 허용 | 키 / 참조 |
|---|---|---|---|
| `id` | `bigint` | NO | PRI |
| `created_at` | `datetime(6)` | NO |  |
| `email` | `varchar(100)` | NO | UNI |
| `fcm_token` | `text` | YES |  |
| `freshness_score` | `double` | NO |  |
| `latitude` | `double` | YES |  |
| `location` | `varchar(100)` | YES |  |
| `longitude` | `double` | YES |  |
| `name` | `varchar(50)` | NO |  |
| `nickname` | `varchar(50)` | NO | UNI |
| `notification_comment` | `bit(1)` | YES |  |
| `notification_marketing` | `bit(1)` | YES |  |
| `notification_new_post` | `bit(1)` | YES |  |
| `notification_trade_accepted` | `bit(1)` | YES |  |
| `notification_trade_request` | `bit(1)` | YES |  |
| `password` | `varchar(255)` | NO |  |
| `phone_number` | `varchar(20)` | NO | UNI |
| `profile_image` | `text` | YES |  |
| `chat_push_enabled` | `bit(1)` | YES |  |
| `chat_read_receipt_enabled` | `bit(1)` | YES |  |
| `hide_left_chat_rooms` | `bit(1)` | YES |  |

## 해석

- `push_subscriptions`는 DB에 남아 있는 이전 Web Push 테이블입니다. 현재 기기 푸시는 `user_fcm_tokens`를 사용합니다.
- `users.fcm_token`과 채팅방의 기존 개인 설정 컬럼 등 하위 호환 데이터가 남아 있습니다.
- `MUL`은 인덱스이며 외래키를 의미하지 않습니다. 실제 FK는 별도로 표시했습니다.
- `auth_attempts.id`는 인증 동작과 식별자의 해시이며 `users.id` FK가 아닙니다.
- `reports.target_id`와 알림의 `target_id`는 대상 종류에 따른 다형 참조입니다.
- 이메일 검증은 이메일 문자열로 연결하며 사용자 FK를 두지 않습니다.
- 배지·업적은 활동 데이터로 계산합니다.
