package com.interviewplatform.notification.log;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_log", schema = "notification")
public class NotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * The eventId from InterviewEvent — used for idempotency dedup.
     * Unique constraint is enforced both here and in the DB index.
     */
    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    /** Plain UUID — no cross-service JPA relation. */
    @Column(name = "interview_id", nullable = false)
    private UUID interviewId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private NotificationType type;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    /** "CANDIDATE" for all four of these event types; recruiters are not notified. */
    @Column(name = "recipient_role", nullable = false, length = 20)
    private String recipientRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DeliveryStatus status;

    /** Set to now only when the send succeeded; null when FAILED. */
    @Column(name = "sent_at")
    private Instant sentAt;

    /** Populated when status = FAILED. */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    protected NotificationLog() {}

    public NotificationLog(UUID eventId,
                           UUID interviewId,
                           NotificationType type,
                           String recipientEmail,
                           String recipientRole,
                           DeliveryStatus status,
                           Instant sentAt,
                           String errorMessage) {
        this.eventId = eventId;
        this.interviewId = interviewId;
        this.type = type;
        this.recipientEmail = recipientEmail;
        this.recipientRole = recipientRole;
        this.status = status;
        this.sentAt = sentAt;
        this.errorMessage = errorMessage;
    }

    public UUID getId() { return id; }
    public UUID getEventId() { return eventId; }
    public UUID getInterviewId() { return interviewId; }
    public NotificationType getType() { return type; }
    public String getRecipientEmail() { return recipientEmail; }
    public String getRecipientRole() { return recipientRole; }
    public DeliveryStatus getStatus() { return status; }
    public Instant getSentAt() { return sentAt; }
    public String getErrorMessage() { return errorMessage; }
}
