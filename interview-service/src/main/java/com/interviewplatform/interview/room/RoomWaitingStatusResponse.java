package com.interviewplatform.interview.room;

import java.time.Instant;

public record RoomWaitingStatusResponse(
    boolean admitted,
    Instant candidateWaitingSince,
    boolean waiting) {
}
