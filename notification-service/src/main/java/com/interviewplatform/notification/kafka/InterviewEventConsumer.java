package com.interviewplatform.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewplatform.notification.log.DeliveryStatus;
import com.interviewplatform.notification.log.NotificationLog;
import com.interviewplatform.notification.log.NotificationLogRepository;
import com.interviewplatform.notification.log.NotificationType;
import com.interviewplatform.notification.mail.MailService;
import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Consumes interview events from Kafka.
 *
 * Transaction boundary: the mail send intentionally happens OUTSIDE any DB
 * transaction, so a slow or failing SMTP call never holds a DB connection open.
 * Exactly ONE NotificationLog row per non-duplicate eventId is written AFTER the
 * send attempt, reflecting the real outcome (SENT + sentAt, or FAILED +
 * errorMessage). The single insert runs in its own short transaction (Spring Data
 * JPA default), and the event_id UNIQUE constraint is the idempotency backstop.
 * The dedup check is a plain read; a redelivered message (Kafka at-least-once,
 * sequential within a consumer) is caught by existsByEventId and skipped with no
 * row and no email.
 */
@Component
public class InterviewEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(InterviewEventConsumer.class);

    static final String TOPIC_SCHEDULED        = "interview.scheduled";
    static final String TOPIC_RESCHEDULED      = "interview.rescheduled";
    static final String TOPIC_CANCELLED        = "interview.cancelled";
    static final String TOPIC_LINK_REGENERATED = "interview.link-regenerated";

    /** Recipient role for every event handled by this consumer (recruiters are not notified). */
    private static final String RECIPIENT_ROLE = "CANDIDATE";

    private final ObjectMapper objectMapper;
    private final NotificationLogRepository logRepository;
    private final MailService mailService;

    public InterviewEventConsumer(ObjectMapper objectMapper,
                                  NotificationLogRepository logRepository,
                                  MailService mailService) {
        this.objectMapper = objectMapper;
        this.logRepository = logRepository;
        this.mailService = mailService;
    }

    // -------------------------------------------------------------------------
    // Listeners — one method per topic so each maps unambiguously to a type.
    // -------------------------------------------------------------------------

    @KafkaListener(topics = TOPIC_SCHEDULED, groupId = "notification-service")
    public void onScheduled(String payload) {
        handle(payload, NotificationType.INVITATION);
    }

    @KafkaListener(topics = TOPIC_RESCHEDULED, groupId = "notification-service")
    public void onRescheduled(String payload) {
        handle(payload, NotificationType.RESCHEDULED);
    }

    @KafkaListener(topics = TOPIC_CANCELLED, groupId = "notification-service")
    public void onCancelled(String payload) {
        handle(payload, NotificationType.CANCELLED);
    }

    @KafkaListener(topics = TOPIC_LINK_REGENERATED, groupId = "notification-service")
    public void onLinkRegenerated(String payload) {
        handle(payload, NotificationType.LINK_REGENERATED);
    }

    // -------------------------------------------------------------------------
    // Core logic
    // -------------------------------------------------------------------------

    void handle(String payload, NotificationType type) {
        InterviewEventDto event;
        try {
            event = objectMapper.readValue(payload, InterviewEventDto.class);
        } catch (Exception e) {
            log.error("Failed to deserialize Kafka payload for type {}: {}", type, e.getMessage(), e);
            return;
        }

        if (logRepository.existsByEventId(event.getEventId())) {
            log.info("Duplicate eventId {} for type {} — skipping (no email, no new row)",
                    event.getEventId(), type);
            return;
        }

        // Send the mail outside any DB transaction. Catch the exception so it
        // never propagates out of the listener — propagation would trigger Kafka
        // redelivery, which defeats the point of the dedup check.
        boolean sent = false;
        String errorMessage = null;
        try {
            send(event, type);
            sent = true;
        } catch (Exception e) {
            log.error("Failed to send email for eventId={} type={}: {}",
                    event.getEventId(), type, e.getMessage(), e);
            errorMessage = e.getMessage();
        }

        // Exactly one row, written once, reflecting the real outcome.
        logRepository.save(new NotificationLog(
                event.getEventId(),
                event.getInterviewId(),
                type,
                event.getCandidateEmail(),
                RECIPIENT_ROLE,
                sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
                sent ? Instant.now() : null,
                errorMessage));
    }

    private void send(InterviewEventDto event, NotificationType type) throws MessagingException {
        switch (type) {
            case INVITATION        -> mailService.sendInvitation(event);
            case RESCHEDULED       -> mailService.sendRescheduled(event);
            case CANCELLED         -> mailService.sendCancelled(event);
            case LINK_REGENERATED  -> mailService.sendLinkRegenerated(event);
            default                -> throw new IllegalArgumentException("No mail handler for type " + type);
        }
    }
}
