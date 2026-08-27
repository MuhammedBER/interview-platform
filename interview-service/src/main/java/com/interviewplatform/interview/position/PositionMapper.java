package com.interviewplatform.interview.position;

import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class PositionMapper {

    public JobPosition toNewPosition(PositionRequest request, UUID organizationId) {
        JobPosition position = new JobPosition(
                organizationId,
                request.name(),
                request.description(),
                request.status());

        if (request.templates() != null) {
            for (TemplateSegmentRequest segment : request.templates()) {
                position.addTemplate(toNewSegment(segment));   // keeps both sides in sync
            }
        }
        return position;
    }

    public TemplateSegment toNewSegment(TemplateSegmentRequest request) {
        List<String> questions = (request.defaultQuestions() != null)
                ? request.defaultQuestions()
                : new ArrayList<>();
        return new TemplateSegment(
                request.title(),
                request.orderIndex(),
                request.plannedMinutes(),
                questions);
    }

    public PositionResponse toResponse(JobPosition position) {
        List<TemplateSegmentResponse> templates = position.getTemplates().stream()
                .map(this::toResponse)
                .toList();
        return new PositionResponse(
                position.getId(),
                position.getName(),
                position.getDescription(),
                position.getStatus(),
                position.getCreatedAt(),
                templates);
    }

    public TemplateSegmentResponse toResponse(TemplateSegment segment) {
        return new TemplateSegmentResponse(
                segment.getId(),
                segment.getTitle(),
                segment.getOrderIndex(),
                segment.getPlannedMinutes(),
                segment.getDefaultQuestions());
    }
}