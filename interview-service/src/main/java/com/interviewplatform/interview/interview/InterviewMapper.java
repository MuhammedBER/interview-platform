package com.interviewplatform.interview.interview;

import com.interviewplatform.interview.position.TemplateSegment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class InterviewMapper {
    public InterviewSegment copyFromTemplate(TemplateSegment template) {
        List<String> questions = new ArrayList<>(template.getDefaultQuestions()); // defensive copy
        return new InterviewSegment(
                template.getTitle(),
                template.getOrderIndex(),
                template.getPlannedMinutes(),
                questions);
    }

    public InterviewSegment toNewSegment(ScheduleInterviewRequest.ScheduleSegmentInput input) {
        List<String> questions = (input.preparedQuestions() != null)
                ? new ArrayList<>(input.preparedQuestions())
                : new ArrayList<>();
        return new InterviewSegment(
                input.title(),
                input.orderIndex(),
                input.plannedMinutes(),
                questions);
    }

    public InterviewResponse toResponse(Interview interview) {
        List<InterviewSegmentResponse> segments = interview.getSegments().stream()
                .map(this::toResponse)
                .toList();
        return new InterviewResponse(
                interview.getId(),
                interview.getRecruiterId(),
                interview.getCandidateId(),
                interview.getJobPositionId(),
                interview.getScheduledStart(),
                interview.getDurationMinutes(),
                interview.getStatus(),
                interview.isAdmitted(),
                interview.getCancelledAt(),
                interview.getCandidateWaitingSince(),
                segments,
                null,
                null,
                null,
                null);
    }

    public InterviewSegmentResponse toResponse(InterviewSegment segment) {
        return new InterviewSegmentResponse(
                segment.getId(),
                segment.getTitle(),
                segment.getOrderIndex(),
                segment.getPlannedMinutes(),
                segment.getPreparedQuestions(),
                segment.getActualStart(),
                segment.getActualEnd());
    }
}