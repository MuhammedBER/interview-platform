package com.interviewplatform.interview.reminder;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewRepository;
import com.interviewplatform.interview.interview.InterviewStatus;
import com.interviewplatform.interview.kafka.InterviewEvent;
import com.interviewplatform.interview.kafka.InterviewReminderDomainEvent;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReminderSchedulerTest {

    @Mock private InterviewRepository interviewRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private RecruiterRepository recruiterRepository;
    @Mock private JobPositionRepository jobPositionRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    private ReminderScheduler scheduler;

    private final UUID orgId = UUID.randomUUID();
    private final UUID candidateId = UUID.randomUUID();
    private final UUID recruiterId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // Defaults matching application.yml: 24h window, 1h window.
        scheduler = new ReminderScheduler(
                interviewRepository,
                candidateRepository,
                recruiterRepository,
                jobPositionRepository,
                eventPublisher,
                1440,
                60
        );
    }

    @Test
    void checkForReminders_interviewDueWithin24h_stampsAndPublishesOnce() {
        Interview interview = newInterview(InterviewStatus.SCHEDULED, Instant.now().plusSeconds(2 * 3600));
        when(interviewRepository.findDueFor24hReminder(any(), any())).thenReturn(List.of(interview));
        when(interviewRepository.findDueFor1hReminder(any(), any())).thenReturn(List.of());
        when(interviewRepository.save(any(Interview.class))).thenReturn(interview);
        stubEventLookups();

        scheduler.checkForReminders();

        assertThat(interview.getReminder24hSentAt()).isNotNull();
        verify(interviewRepository).save(interview);

        InterviewReminderDomainEvent published = captureSinglePublish();
        assertThat(published.event().joinUrl()).isNull();
        assertThat(published.event().scheduledStart()).isEqualTo(interview.getScheduledStart());
    }

    @Test
    void checkForReminders_interviewDueWithin1h_stampsAndPublishesOnce() {
        Interview interview = newInterview(InterviewStatus.SCHEDULED, Instant.now().plusSeconds(30 * 60));
        when(interviewRepository.findDueFor24hReminder(any(), any())).thenReturn(List.of());
        when(interviewRepository.findDueFor1hReminder(any(), any())).thenReturn(List.of(interview));
        when(interviewRepository.save(any(Interview.class))).thenReturn(interview);
        stubEventLookups();

        scheduler.checkForReminders();

        assertThat(interview.getReminder1hSentAt()).isNotNull();
        verify(interviewRepository).save(interview);
        captureSinglePublish();
    }

    @Test
    void checkForReminders_alreadyStamped_isNotReprocessed() {
        Interview interview = newInterview(InterviewStatus.SCHEDULED, Instant.now().plusSeconds(2 * 3600));
        interview.setReminder24hSentAt(Instant.now().minusSeconds(60));
        // Repo returns it (simulating a race) but the defensive null-check must skip it.
        when(interviewRepository.findDueFor24hReminder(any(), any())).thenReturn(List.of(interview));
        when(interviewRepository.findDueFor1hReminder(any(), any())).thenReturn(List.of());

        scheduler.checkForReminders();

        verify(interviewRepository, never()).save(any());
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void checkForReminders_nothingDue_publishesNothing() {
        when(interviewRepository.findDueFor24hReminder(any(), any())).thenReturn(List.of());
        when(interviewRepository.findDueFor1hReminder(any(), any())).thenReturn(List.of());

        scheduler.checkForReminders();

        verify(interviewRepository, never()).save(any());
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void checkForReminders_interviewInBothWindows_processedOnlyOnceInOnePass() {
        Interview interview = newInterview(InterviewStatus.SCHEDULED, Instant.now().plusSeconds(30 * 60));
        when(interviewRepository.findDueFor24hReminder(any(), any())).thenReturn(List.of(interview));
        when(interviewRepository.findDueFor1hReminder(any(), any())).thenReturn(List.of(interview));
        // With both windows matching, the 1h pass wins and the 24h pass must skip it.
        when(interviewRepository.save(any(Interview.class))).thenReturn(interview);
        when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(new Candidate(orgId, "Jane", "Candidate", "jane@test.com", "+1")));
        when(recruiterRepository.findById(recruiterId)).thenReturn(Optional.of(new Recruiter(orgId, "sub", "John", "Recruiter", "john@test.com")));

        scheduler.checkForReminders();

        assertThat(interview.getReminder1hSentAt()).isNotNull();
        assertThat(interview.getReminder24hSentAt()).isNull();
        verify(interviewRepository, times(1)).save(any(Interview.class));
        verify(eventPublisher, times(1)).publishEvent(any(InterviewReminderDomainEvent.class));
    }

    // -------------------------------------------------------------------------

    private Interview newInterview(InterviewStatus status, Instant scheduledStart) {
        return new Interview(orgId, recruiterId, candidateId, null, scheduledStart, 60, status);
    }

    private void stubEventLookups() {
        when(candidateRepository.findById(candidateId))
                .thenReturn(Optional.of(new Candidate(orgId, "Jane", "Candidate", "jane@test.com", "+1")));
        when(recruiterRepository.findById(recruiterId))
                .thenReturn(Optional.of(new Recruiter(orgId, "sub", "John", "Recruiter", "john@test.com")));
    }

    private InterviewReminderDomainEvent captureSinglePublish() {
        ArgumentCaptor<InterviewReminderDomainEvent> captor =
                ArgumentCaptor.forClass(InterviewReminderDomainEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        return captor.getValue();
    }
}
