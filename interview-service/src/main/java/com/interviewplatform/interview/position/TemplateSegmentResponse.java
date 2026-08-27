package com.interviewplatform.interview.position;

import java.util.List;
import java.util.UUID;

public record TemplateSegmentResponse(
        UUID id,
        String title,
        int orderIndex,
        int plannedMinutes,
        List<String> defaultQuestions
) {
}