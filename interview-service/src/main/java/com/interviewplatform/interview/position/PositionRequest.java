package com.interviewplatform.interview.position;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PositionRequest(
    @NotBlank String name,
    String description,
    @NotNull PositionStatus status,
    @NotNull @Valid List<TemplateSegmentRequest> templates) {}
