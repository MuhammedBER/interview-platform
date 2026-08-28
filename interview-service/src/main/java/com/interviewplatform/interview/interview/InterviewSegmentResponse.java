package com.interviewplatform.interview.interview;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InterviewSegmentResponse(
        UUID id,
        String title,
        int orderIndex,
        int plannedMinutes,
        List<String> preparedQuestions,
        Instant actualStart,
        Instant actualEnd
) {}
