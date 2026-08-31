package com.interviewplatform.interview.interview;

import java.time.Instant;
import java.util.UUID;

public record InterviewListItemResponse(
        UUID id,
        String title,
        String candidateName,
        String candidateEmail,
        UUID positionId,
        String positionName,
        Instant scheduledStart,
        int durationMinutes,
        int segmentCount,
        InterviewStatus status,
        boolean admitted
) {}
