package com.interviewplatform.interview.position;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PositionResponse(
        UUID id,
        String name,
        String description,
        PositionStatus status,
        Instant createdAt,
        List<TemplateSegmentResponse> templates
) {
}