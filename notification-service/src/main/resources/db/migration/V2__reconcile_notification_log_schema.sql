-- V2: reconcile V1 schema with the final domain model.
-- V1 (never edited once applied) wrote recipient_name + created_at and used
-- notification_type/delivery_status column names. This migration renames to the
-- documented model: type, status, and swaps recipient_name -> recipient_role,
-- created_at -> sent_at (set only on a successful send).

ALTER TABLE notification.notification_log
    DROP COLUMN recipient_name,
    DROP COLUMN created_at;

ALTER TABLE notification.notification_log
    RENAME COLUMN notification_type TO type;
ALTER TABLE notification.notification_log
    RENAME COLUMN delivery_status TO status;

ALTER TABLE notification.notification_log
    ADD COLUMN recipient_role VARCHAR(20) NOT NULL DEFAULT 'CANDIDATE',
    ADD COLUMN sent_at TIMESTAMPTZ;
