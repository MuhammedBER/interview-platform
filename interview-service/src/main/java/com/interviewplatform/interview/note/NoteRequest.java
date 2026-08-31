package com.interviewplatform.interview.note;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record NoteRequest(
    @NotBlank String content,
    UUID segmentId) {
}
