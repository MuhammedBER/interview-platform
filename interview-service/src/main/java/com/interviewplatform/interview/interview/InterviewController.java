package com.interviewplatform.interview.interview;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @PostMapping
    public ResponseEntity<InterviewResponse> schedule(@Valid @RequestBody ScheduleInterviewRequest request) {
        InterviewResponse created = interviewService.schedule(request);
        URI location = URI.create("/api/interviews/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping
    public List<InterviewListItemResponse> list(@RequestParam(name = "status", required = false) InterviewStatus status) {
        return interviewService.list(status);
    }

    @GetMapping("/{id}")
    public InterviewResponse get(@PathVariable UUID id) {
        return interviewService.get(id);
    }

    @PostMapping("/{id}/reschedule")
    public InterviewResponse reschedule(@PathVariable UUID id,
                                        @Valid @RequestBody RescheduleInterviewRequest request) {
        return interviewService.reschedule(id, request);
    }

    @PostMapping("/{id}/cancel")
    public InterviewResponse cancel(@PathVariable UUID id) {
        return interviewService.cancel(id);
    }

    @PostMapping("/{id}/regenerate-link")
    public ResponseEntity<Map<String, String>> regenerateLink(@PathVariable UUID id) {
        String joinUrl = interviewService.regenerateLink(id);
        return ResponseEntity.ok(Map.of("joinUrl", joinUrl));
    }

    @PostMapping("/{id}/revoke-link")
    public ResponseEntity<Void> revokeLink(@PathVariable UUID id) {
        interviewService.revokeLink(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/admit")
    public InterviewResponse admit(@PathVariable UUID id) {
        return interviewService.admit(id);
    }

    @PostMapping("/{id}/no-show")
    public ResponseEntity<InterviewResponse> noShow(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.noShow(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<InterviewResponse> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.complete(id));
    }
}