package com.interviewplatform.interview.interview;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ScheduleInterviewRequest(
        @NotNull @Valid CandidateInput candidate,
        UUID jobPositionId,
        @NotNull Instant scheduledStart,
        @NotNull @Min(1) Integer durationMinutes,
        @Valid List<ScheduleSegmentInput> segments
) {
    public record CandidateInput(
            @NotBlank String firstName,
            @NotBlank String lastName,
            @NotBlank @Email String email,
            String phone
    ) {}

    public record ScheduleSegmentInput(
            @NotBlank String title,
            @NotNull @Min(0) Integer orderIndex,
            @NotNull @Min(1) Integer plannedMinutes,
            List<String> preparedQuestions
    ) {}
}