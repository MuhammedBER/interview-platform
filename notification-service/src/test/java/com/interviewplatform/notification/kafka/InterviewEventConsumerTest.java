package com.interviewplatform.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.interviewplatform.notification.log.DeliveryStatus;
import com.interviewplatform.notification.log.NotificationLog;
import com.interviewplatform.notification.log.NotificationLogRepository;
import com.interviewplatform.notification.log.NotificationType;
import com.interviewplatform.notification.mail.MailService;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewEventConsumerTest {

    @Mock private NotificationLogRepository logRepository;
    @Mock private MailService mailService;

    private InterviewEventConsumer consumer;
    private ObjectMapper objectMapper;

    private static final UUID EVENT_ID     = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID INTERVIEW_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        consumer = new InterviewEventConsumer(objectMapper, logRepository, mailService);
    }

    // -------------------------------------------------------------------------
    // Happy path: each event type sends a mail and logs exactly one SENT row.
    // -------------------------------------------------------------------------

    @Test
    void handle_scheduled_sendsInvitationAndLogsSent() throws Exception {
        String payload = buildPayload(EVENT_ID, INTERVIEW_ID);
        when(logRepository.existsByEventId(EVENT_ID)).thenReturn(false);

        consumer.handle(payload, NotificationType.INVITATION);

        NotificationLog row = assertSingleRow(DeliveryStatus.SENT);
        assertThat(row.getType()).isEqualTo(NotificationType.INVITATION);
        assertThat(row.getSentAt()).isNotNull();
        verify(mailService).sendInvitation(any(InterviewEventDto.class));
        verifyNoMoreInteractions(mailService);
    }

    @Test
    void handle_rescheduled_sendsRescheduledAndLogsSent() throws Exception {
        String payload = buildPayload(EVENT_ID, INTERVIEW_ID);
        when(logRepository.existsByEventId(EVENT_ID)).thenReturn(false);

        consumer.handle(payload, NotificationType.RESCHEDULED);

        assertSingleRow(DeliveryStatus.SENT);
        verify(mailService).sendRescheduled(any(InterviewEventDto.class));
        verifyNoMoreInteractions(mailService);
    }

    @Test
    void handle_cancelled_sendsCancelledAndLogsSent() throws Exception {
        String payload = buildPayload(EVENT_ID, INTERVIEW_ID);
        when(logRepository.existsByEventId(EVENT_ID)).thenReturn(false);

        consumer.handle(payload, NotificationType.CANCELLED);

        assertSingleRow(DeliveryStatus.SENT);
        verify(mailService).sendCancelled(any(InterviewEventDto.class));
        verifyNoMoreInteractions(mailService);
    }

    @Test
    void handle_linkRegenerated_sendsLinkAndLogsSent() throws Exception {
        String payload = buildPayload(EVENT_ID, INTERVIEW_ID);
        when(logRepository.existsByEventId(EVENT_ID)).thenReturn(false);

        consumer.handle(payload, NotificationType.LINK_REGENERATED);

        assertSingleRow(DeliveryStatus.SENT);
        verify(mailService).sendLinkRegenerated(any(InterviewEventDto.class));
        verifyNoMoreInteractions(mailService);
    }

    // -------------------------------------------------------------------------
    // Deduplication: a repeated eventId is skipped — no second send, no second row.
    // -------------------------------------------------------------------------

    @Test
    void handle_duplicateEventId_skipsSendAndWritesNoRow() throws Exception {
        String payload = buildPayload(EVENT_ID, INTERVIEW_ID);
        when(logRepository.existsByEventId(EVENT_ID)).thenReturn(true);

        consumer.handle(payload, NotificationType.INVITATION);

        verify(logRepository, never()).save(any());
        verifyNoInteractions(mailService);
    }

    // -------------------------------------------------------------------------
    // Malformed payload: nothing persisted, nothing sent.
    // -------------------------------------------------------------------------

    @Test
    void handle_malformedPayload_doesNotPersistOrSend() {
        consumer.handle("not-valid-json{{", NotificationType.INVITATION);

        verify(logRepository, never()).save(any());
        verifyNoInteractions(mailService);
    }

    // -------------------------------------------------------------------------
    // Mail failure: exactly ONE row, status FAILED, errorMessage set, and the
    // exception does not propagate.
    // -------------------------------------------------------------------------

    @Test
    void handle_mailThrows_writesExactlyOneFailedRow() throws Exception {
        String payload = buildPayload(EVENT_ID, INTERVIEW_ID);
        when(logRepository.existsByEventId(EVENT_ID)).thenReturn(false);
        doThrow(new MessagingException("SMTP failure"))
                .when(mailService).sendInvitation(any(InterviewEventDto.class));

        consumer.handle(payload, NotificationType.INVITATION);

        NotificationLog row = assertSingleRow(DeliveryStatus.FAILED);
        assertThat(row.getSentAt()).isNull();
        assertThat(row.getErrorMessage()).isEqualTo("SMTP failure");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private NotificationLog assertSingleRow(DeliveryStatus expectedStatus) {
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(logRepository, times(1)).save(captor.capture());
        NotificationLog row = captor.getValue();
        assertThat(row.getStatus()).isEqualTo(expectedStatus);
        assertThat(row.getRecipientEmail()).isEqualTo("jane@example.com");
        assertThat(row.getRecipientRole()).isEqualTo("CANDIDATE");
        assertThat(row.getEventId()).isEqualTo(EVENT_ID);
        return row;
    }

    private String buildPayload(UUID eventId, UUID interviewId) throws Exception {
        InterviewEventDto dto = new InterviewEventDto();
        dto.setEventId(eventId);
        dto.setInterviewId(interviewId);
        dto.setInterviewTitle("Senior Java Developer Interview");
        dto.setCandidateName("Jane Candidate");
        dto.setCandidateEmail("jane@example.com");
        dto.setRecruiterName("John Recruiter");
        dto.setRecruiterEmail("john@example.com");
        dto.setJoinUrl("http://localhost:3000/join/abc123");
        dto.setScheduledStart(Instant.parse("2026-08-30T10:00:00Z"));
        dto.setOccurredAt(Instant.parse("2026-08-29T09:00:00Z"));
        return objectMapper.writeValueAsString(dto);
    }
}
