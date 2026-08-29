package com.interviewplatform.interview.kafka;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InterviewEventListenerTest {

  @Mock
  private InterviewEventPublisher interviewEventPublisher;

  private InterviewEventListener listener;
  private InterviewEvent sampleEvent;

  @BeforeEach
  void setUp() {
    listener = new InterviewEventListener(interviewEventPublisher);
    sampleEvent = new InterviewEvent(
        UUID.randomUUID(),
        UUID.randomUUID(),
        "Software Engineer Interview",
        "Jane Candidate",
        "jane@example.com",
        "John Recruiter",
        "john@example.com",
        "http://localhost:3000/join/sample-raw-token",
        Instant.now()
    );
  }

  @Test
  void onInterviewScheduled_publishesEventToScheduledTopic() {
    listener.onInterviewScheduled(new InterviewScheduledDomainEvent(sampleEvent));
    verify(interviewEventPublisher).publish(InterviewEventListener.TOPIC_INTERVIEW_SCHEDULED, sampleEvent);
  }

  @Test
  void onInterviewRescheduled_publishesEventToRescheduledTopic() {
    listener.onInterviewRescheduled(new InterviewRescheduledDomainEvent(sampleEvent));
    verify(interviewEventPublisher).publish(InterviewEventListener.TOPIC_INTERVIEW_RESCHEDULED, sampleEvent);
  }

  @Test
  void onInterviewCancelled_publishesEventToCancelledTopic() {
    listener.onInterviewCancelled(new InterviewCancelledDomainEvent(sampleEvent));
    verify(interviewEventPublisher).publish(InterviewEventListener.TOPIC_INTERVIEW_CANCELLED, sampleEvent);
  }

  @Test
  void onInterviewLinkRegenerated_publishesEventToLinkRegeneratedTopic() {
    listener.onInterviewLinkRegenerated(new InterviewLinkRegeneratedDomainEvent(sampleEvent));
    verify(interviewEventPublisher).publish(InterviewEventListener.TOPIC_INTERVIEW_LINK_REGENERATED, sampleEvent);
  }
}
