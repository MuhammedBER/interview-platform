CREATE TABLE notification.notification_log (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID         NOT NULL UNIQUE,
    interview_id      UUID         NOT NULL,
    notification_type VARCHAR(40)  NOT NULL,
    recipient_email   VARCHAR(255) NOT NULL,
    recipient_name    VARCHAR(255) NOT NULL,
    delivery_status   VARCHAR(20)  NOT NULL,
    error_message     TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_interview_id ON notification.notification_log (interview_id);
CREATE INDEX idx_notification_log_created_at   ON notification.notification_log (created_at DESC);
