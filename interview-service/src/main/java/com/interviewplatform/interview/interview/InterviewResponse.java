package com.interviewplatform.interview.interview;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InterviewResponse(
        UUID id,
        UUID recruiterId,
        UUID candidateId,
        UUID jobPositionId,
        Instant scheduledStart,
        int durationMinutes,
        InterviewStatus status,
        boolean admitted,
        Instant cancelledAt,
        List<InterviewSegmentResponse> segments
) {}