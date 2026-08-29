package com.interviewplatform.interview.kafka;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class InterviewEventListener {

  public static final String TOPIC_INTERVIEW_SCHEDULED = "interview.scheduled";
  public static final String TOPIC_INTERVIEW_RESCHEDULED = "interview.rescheduled";
  public static final String TOPIC_INTERVIEW_CANCELLED = "interview.cancelled";
  public static final String TOPIC_INTERVIEW_LINK_REGENERATED = "interview.link-regenerated";

  private final InterviewEventPublisher interviewEventPublisher;

  public InterviewEventListener(InterviewEventPublisher interviewEventPublisher) {
    this.interviewEventPublisher = interviewEventPublisher;
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onInterviewScheduled(InterviewScheduledDomainEvent domainEvent) {
    interviewEventPublisher.publish(TOPIC_INTERVIEW_SCHEDULED, domainEvent.event());
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onInterviewRescheduled(InterviewRescheduledDomainEvent domainEvent) {
    interviewEventPublisher.publish(TOPIC_INTERVIEW_RESCHEDULED, domainEvent.event());
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onInterviewCancelled(InterviewCancelledDomainEvent domainEvent) {
    interviewEventPublisher.publish(TOPIC_INTERVIEW_CANCELLED, domainEvent.event());
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onInterviewLinkRegenerated(InterviewLinkRegeneratedDomainEvent domainEvent) {
    interviewEventPublisher.publish(TOPIC_INTERVIEW_LINK_REGENERATED, domainEvent.event());
  }
}
