package com.interviewplatform.interview.interview;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.jointoken.JoinTokenService;
import com.interviewplatform.interview.kafka.InterviewCancelledDomainEvent;
import com.interviewplatform.interview.kafka.InterviewEvent;
import com.interviewplatform.interview.kafka.InterviewLinkRegeneratedDomainEvent;
import com.interviewplatform.interview.kafka.InterviewRescheduledDomainEvent;
import com.interviewplatform.interview.kafka.InterviewScheduledDomainEvent;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.position.PositionStatus;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import com.interviewplatform.interview.tenancy.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {

  @Mock private InterviewRepository interviewRepository;
  @Mock private CandidateRepository candidateRepository;
  @Mock private RecruiterRepository recruiterRepository;
  @Mock private JobPositionRepository jobPositionRepository;
  @Mock private InterviewMapper interviewMapper;
  @Mock private TenantContext tenantContext;
  @Mock private JoinTokenService joinTokenService;
  @Mock private ApplicationEventPublisher eventPublisher;

  private InterviewService interviewService;

  private final UUID orgId = UUID.randomUUID();
  private final String subject = "keycloak-sub-123";
  private final String joinBaseUrl = "http://localhost:3000/join";

  @BeforeEach
  void setUp() {
    interviewService = new InterviewService(
        interviewRepository,
        candidateRepository,
        recruiterRepository,
        jobPositionRepository,
        interviewMapper,
        tenantContext,
        joinTokenService,
        eventPublisher,
        joinBaseUrl
    );
  }

  @Test
  void schedule_generatesJoinTokenAndPublishesInterviewScheduledDomainEvent() {
    // Arrange
    when(tenantContext.getOrganizationId()).thenReturn(orgId);
    when(tenantContext.getKeycloakSubject()).thenReturn(subject);

    Recruiter recruiter = new Recruiter(orgId, subject, "John", "Recruiter", "recruiter@test.com");
    when(recruiterRepository.findByKeycloakSubjectAndOrganizationId(subject, orgId))
        .thenReturn(Optional.of(recruiter));

    ScheduleInterviewRequest.CandidateInput candidateInput =
        new ScheduleInterviewRequest.CandidateInput("Jane", "Candidate", "jane@test.com", "+12345");
    Candidate candidate = new Candidate(orgId, "Jane", "Candidate", "jane@test.com", "+12345");
    when(candidateRepository.findByOrganizationIdAndEmail(orgId, "jane@test.com"))
        .thenReturn(Optional.of(candidate));

    UUID positionId = UUID.randomUUID();
    JobPosition position = new JobPosition(orgId, "Senior Java Developer", "Desc", PositionStatus.ACTIVE);
    when(jobPositionRepository.findByIdAndOrganizationId(positionId, orgId))
        .thenReturn(Optional.of(position));

    ScheduleInterviewRequest.ScheduleSegmentInput segmentInput =
        new ScheduleInterviewRequest.ScheduleSegmentInput("Intro", 0, 15, List.of("Q1"));
    ScheduleInterviewRequest request = new ScheduleInterviewRequest(
        candidateInput,
        positionId,
        Instant.parse("2026-09-01T10:00:00Z"),
        60,
        List.of(segmentInput)
    );

    InterviewSegment segment = new InterviewSegment("Intro", 0, 15, List.of("Q1"));
    when(interviewMapper.toNewSegment(segmentInput)).thenReturn(segment);

    Interview mockSaved = new Interview(
        orgId, recruiter.getId(), candidate.getId(), positionId, request.scheduledStart(), 60, InterviewStatus.SCHEDULED
    );
    when(interviewRepository.save(any(Interview.class))).thenReturn(mockSaved);
    when(joinTokenService.generateJoinToken(mockSaved)).thenReturn("raw-test-token-123");

    InterviewResponse mockResponse = mock(InterviewResponse.class);
    when(interviewMapper.toResponse(mockSaved)).thenReturn(mockResponse);

    // Act
    InterviewResponse response = interviewService.schedule(request);

    // Assert
    assertThat(response).isNotNull();

    verify(joinTokenService).generateJoinToken(mockSaved);

    ArgumentCaptor<InterviewScheduledDomainEvent> eventCaptor =
        ArgumentCaptor.forClass(InterviewScheduledDomainEvent.class);
    verify(eventPublisher).publishEvent(eventCaptor.capture());

    InterviewScheduledDomainEvent domainEvent = eventCaptor.getValue();
    assertThat(domainEvent).isNotNull();

    InterviewEvent event = domainEvent.event();
    assertThat(event.eventId()).isNotNull();
    assertThat(event.interviewId()).isEqualTo(mockSaved.getId());
    assertThat(event.interviewTitle()).isEqualTo("Senior Java Developer");
    assertThat(event.candidateName()).isEqualTo("Jane Candidate");
    assertThat(event.candidateEmail()).isEqualTo("jane@test.com");
    assertThat(event.recruiterName()).isEqualTo("John Recruiter");
    assertThat(event.recruiterEmail()).isEqualTo("recruiter@test.com");
    assertThat(event.joinUrl()).isEqualTo("http://localhost:3000/join/raw-test-token-123");
    assertThat(event.scheduledStart()).isEqualTo(mockSaved.getScheduledStart());
    assertThat(event.occurredAt()).isNotNull();
  }

  @Test
  void reschedule_regeneratesJoinTokenAndPublishesInterviewRescheduledDomainEvent() {
    // Arrange
    UUID interviewId = UUID.randomUUID();
    when(tenantContext.getOrganizationId()).thenReturn(orgId);

    Interview interview = new Interview(orgId, UUID.randomUUID(), UUID.randomUUID(), null, Instant.now(), 60, InterviewStatus.SCHEDULED);
    when(interviewRepository.findByIdAndOrganizationId(interviewId, orgId)).thenReturn(Optional.of(interview));
    when(interviewRepository.save(interview)).thenReturn(interview);
    when(joinTokenService.regenerateJoinToken(interview)).thenReturn("new-raw-rescheduled-token");

    RescheduleInterviewRequest request = new RescheduleInterviewRequest(Instant.parse("2026-09-02T14:00:00Z"), 45);

    // Act
    interviewService.reschedule(interviewId, request);

    // Assert
    verify(joinTokenService).regenerateJoinToken(interview);

    ArgumentCaptor<InterviewRescheduledDomainEvent> eventCaptor = ArgumentCaptor.forClass(InterviewRescheduledDomainEvent.class);
    verify(eventPublisher).publishEvent(eventCaptor.capture());

    InterviewEvent event = eventCaptor.getValue().event();
    assertThat(event.interviewId()).isEqualTo(interview.getId());
    assertThat(event.joinUrl()).isEqualTo("http://localhost:3000/join/new-raw-rescheduled-token");
    assertThat(event.scheduledStart()).isEqualTo(interview.getScheduledStart());
  }

  @Test
  void cancel_revokesActiveTokensAndPublishesInterviewCancelledDomainEventWithNullJoinUrl() {
    // Arrange
    UUID interviewId = UUID.randomUUID();
    when(tenantContext.getOrganizationId()).thenReturn(orgId);

    Interview interview = new Interview(orgId, UUID.randomUUID(), UUID.randomUUID(), null, Instant.now(), 60, InterviewStatus.SCHEDULED);
    when(interviewRepository.findByIdAndOrganizationId(interviewId, orgId)).thenReturn(Optional.of(interview));
    when(interviewRepository.save(interview)).thenReturn(interview);

    // Act
    interviewService.cancel(interviewId);

    // Assert
    assertThat(interview.getStatus()).isEqualTo(InterviewStatus.CANCELLED);
    assertThat(interview.getCancelledAt()).isNotNull();

    verify(joinTokenService).revokeActiveTokens(interview);

    ArgumentCaptor<InterviewCancelledDomainEvent> eventCaptor = ArgumentCaptor.forClass(InterviewCancelledDomainEvent.class);
    verify(eventPublisher).publishEvent(eventCaptor.capture());

    InterviewEvent event = eventCaptor.getValue().event();
    assertThat(event.interviewId()).isEqualTo(interview.getId());
    assertThat(event.joinUrl()).isNull();
    assertThat(event.scheduledStart()).isEqualTo(interview.getScheduledStart());
  }

  @Test
  void regenerateLink_regeneratesJoinTokenPublishesLinkRegeneratedEventAndReturnsNewUrl() {
    // Arrange
    UUID interviewId = UUID.randomUUID();
    when(tenantContext.getOrganizationId()).thenReturn(orgId);

    Interview interview = new Interview(orgId, UUID.randomUUID(), UUID.randomUUID(), null, Instant.now(), 60, InterviewStatus.SCHEDULED);
    when(interviewRepository.findByIdAndOrganizationId(interviewId, orgId)).thenReturn(Optional.of(interview));
    when(joinTokenService.regenerateJoinToken(interview)).thenReturn("regen-raw-token-456");

    // Act
    String newJoinUrl = interviewService.regenerateLink(interviewId);

    // Assert
    assertThat(newJoinUrl).isEqualTo("http://localhost:3000/join/regen-raw-token-456");
    verify(joinTokenService).regenerateJoinToken(interview);

    ArgumentCaptor<InterviewLinkRegeneratedDomainEvent> eventCaptor = ArgumentCaptor.forClass(InterviewLinkRegeneratedDomainEvent.class);
    verify(eventPublisher).publishEvent(eventCaptor.capture());

    InterviewEvent event = eventCaptor.getValue().event();
    assertThat(event.interviewId()).isEqualTo(interview.getId());
    assertThat(event.joinUrl()).isEqualTo("http://localhost:3000/join/regen-raw-token-456");
    assertThat(event.scheduledStart()).isEqualTo(interview.getScheduledStart());
  }

  @Test
  void revokeLink_revokesActiveTokensWithoutPublishingEvent() {
    // Arrange
    UUID interviewId = UUID.randomUUID();
    when(tenantContext.getOrganizationId()).thenReturn(orgId);

    Interview interview = new Interview(orgId, UUID.randomUUID(), UUID.randomUUID(), null, Instant.now(), 60, InterviewStatus.SCHEDULED);
    when(interviewRepository.findByIdAndOrganizationId(interviewId, orgId)).thenReturn(Optional.of(interview));

    // Act
    interviewService.revokeLink(interviewId);

    // Assert
    verify(joinTokenService).revokeActiveTokens(interview);
    verifyNoInteractions(eventPublisher);
  }

  @Test
  void admit_setsAdmittedToTrueAndIsIdempotentOnSecondCall() {
    // Arrange
    UUID interviewId = UUID.randomUUID();
    when(tenantContext.getOrganizationId()).thenReturn(orgId);

    Interview interview = new Interview(orgId, UUID.randomUUID(), UUID.randomUUID(), null, Instant.now(), 60, InterviewStatus.SCHEDULED);
    assertThat(interview.isAdmitted()).isFalse();

    when(interviewRepository.findByIdAndOrganizationId(interviewId, orgId)).thenReturn(Optional.of(interview));
    when(interviewRepository.save(interview)).thenReturn(interview);

    // Act 1
    interviewService.admit(interviewId);

    // Assert 1
    assertThat(interview.isAdmitted()).isTrue();
    verify(interviewRepository).save(interview);

    // Act 2 (Idempotency check)
    interviewService.admit(interviewId);

    // Assert 2
    assertThat(interview.isAdmitted()).isTrue();
    verify(interviewRepository, times(2)).save(interview);
  }
}
