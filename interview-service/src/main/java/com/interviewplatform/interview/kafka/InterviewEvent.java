package com.interviewplatform.interview.kafka;

import java.time.Instant;
import java.util.UUID;

public record InterviewEvent(
    UUID eventId,
    UUID interviewId,
    String interviewTitle,
    String candidateName,
    String candidateEmail,
    String recruiterName,
    String recruiterEmail,
    String joinUrl,
    Instant occurredAt
) {}
