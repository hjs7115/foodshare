-- MySQL 8.x. Run after the new entity schema has been applied, before accepting traffic.
-- application.yml currently uses Hibernate ddl-auto:update to add the new columns/tables.
-- This script preserves user content. It does not delete duplicate reviews automatically.

CREATE TABLE IF NOT EXISTS app_data_migrations (
    version VARCHAR(80) PRIMARY KEY,
    applied_at DATETIME NOT NULL
);
SET @apply_sessions = NOT EXISTS (
    SELECT 1 FROM app_data_migrations WHERE version='2026-11-04-workflow-safety'
);

-- Preserve the original unique contact-number policy. No phone/SMS verification is required.
-- This also repairs databases where the earlier draft migration removed the unique index.
-- If this query returns duplicates, resolve them explicitly before adding the constraint.
SELECT phone_number,COUNT(*) AS duplicate_count FROM users
GROUP BY phone_number HAVING COUNT(*)>1;
SELECT COUNT(*) INTO @phone_duplicates FROM (
    SELECT 1 FROM users GROUP BY phone_number HAVING COUNT(*)>1
) duplicate_phone_groups;
SELECT COUNT(*) INTO @phone_index FROM (
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND NON_UNIQUE=0 AND INDEX_NAME<>'PRIMARY'
    GROUP BY INDEX_NAME HAVING COUNT(*)=1 AND MAX(COLUMN_NAME)='phone_number'
) unique_phone_indexes;
SET @phone_sql=IF(@phone_duplicates=0 AND @phone_index=0,
    'ALTER TABLE users ADD UNIQUE INDEX uk_users_phone_number (phone_number)',
    'SELECT ''Phone uniqueness already exists, or duplicate contacts require resolution'' AS phone_migration_status');
PREPARE phone_stmt FROM @phone_sql;
EXECUTE phone_stmt;
DEALLOCATE PREPARE phone_stmt;

-- Preserve old direct-room participants and preferences without resurrecting left members.
INSERT INTO chat_room_members (chat_room_id,user_id,unread_count,pinned,muted,joined_at)
SELECT r.id,r.writer_id,r.writer_unread_count,r.writer_pinned,r.writer_muted,r.created_at
FROM chat_rooms r WHERE NOT EXISTS (
    SELECT 1 FROM chat_room_members m WHERE m.chat_room_id=r.id AND m.user_id=r.writer_id
);
INSERT INTO chat_room_members (chat_room_id,user_id,unread_count,pinned,muted,joined_at)
SELECT r.id,r.requester_id,r.requester_unread_count,r.requester_pinned,r.requester_muted,r.created_at
FROM chat_rooms r WHERE NOT EXISTS (
    SELECT 1 FROM chat_room_members m WHERE m.chat_room_id=r.id AND m.user_id=r.requester_id
);
UPDATE chat_room_members m
LEFT JOIN (SELECT chat_room_id,MAX(id) AS last_id FROM chat_messages GROUP BY chat_room_id) latest
  ON latest.chat_room_id=m.chat_room_id
SET m.last_read_message_id=COALESCE(latest.last_id,0)
WHERE m.last_read_message_id IS NULL AND m.unread_count=0;
-- Other old read positions are derived from legacy counters until the next explicit read.

-- Identify old duplicate reviews for explicit resolution. Do not discard evaluation history.
SELECT trade_request_id,reviewer_id,COUNT(*) AS duplicate_count
FROM reviews GROUP BY trade_request_id,reviewer_id HAVING COUNT(*)>1;
SELECT COUNT(*) INTO @review_duplicates FROM (
    SELECT 1 FROM reviews GROUP BY trade_request_id,reviewer_id HAVING COUNT(*)>1
) duplicate_groups;
SELECT COUNT(*) INTO @review_index FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reviews' AND INDEX_NAME='uk_review_trade_author';
SET @review_sql=IF(@review_duplicates=0 AND @review_index=0,
    'ALTER TABLE reviews ADD UNIQUE INDEX uk_review_trade_author (trade_request_id,reviewer_id)',
    'SELECT ''Review constraint already exists, or duplicate reviews require resolution'' AS review_migration_status');
PREPARE review_stmt FROM @review_sql;
EXECUTE review_stmt;
DEALLOCATE PREPARE review_stmt;

-- Old access tokens did not carry a device-session ID. End them once for the new policy.
UPDATE users SET token_version=COALESCE(token_version,0)+1 WHERE @apply_sessions=1;
UPDATE refresh_tokens SET revoked=TRUE WHERE @apply_sessions=1;
INSERT IGNORE INTO app_data_migrations(version,applied_at)
VALUES ('2026-11-04-workflow-safety',NOW());

-- Never fabricate historic consent, completion confirmations, or photo fingerprints.
-- Existing completed trades remain completed; users can dispute them through Reports.
-- Old AI analyses without a photo fingerprint must be analyzed again before being claimed.
