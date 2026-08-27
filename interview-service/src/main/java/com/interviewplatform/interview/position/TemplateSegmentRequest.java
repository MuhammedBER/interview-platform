package com.interviewplatform.interview.position;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record TemplateSegmentRequest(
        @NotBlank String title,
        @NotNull @Min(0) Integer orderIndex,
        @NotNull @Min(1) Integer plannedMinutes,
        List<String> defaultQuestions
) {
}