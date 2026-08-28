package com.interviewplatform.interview.interview;

import java.time.Instant;
import java.util.UUID;

public record InterviewListItemResponse(
        UUID id,
        String candidateName,
        String candidateEmail,
        String positionName,
        Instant scheduledStart,
        int durationMinutes,
        int segmentCount,
        InterviewStatus status
) {}