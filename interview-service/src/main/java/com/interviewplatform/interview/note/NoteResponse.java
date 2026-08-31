package com.interviewplatform.interview.note;

import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
    UUID id,
    UUID interviewId,
    UUID segmentId,
    String content,
    int elapsedSeconds,
    Instant createdAt,
    Instant updatedAt) {
}
