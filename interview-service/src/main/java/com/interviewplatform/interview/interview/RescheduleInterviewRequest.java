package com.interviewplatform.interview.interview;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record RescheduleInterviewRequest(
        @NotNull Instant scheduledStart,
        @Min(1) Integer durationMinutes
) {}