package com.interviewplatform.interview.publicjoin;

import com.interviewplatform.interview.interview.InterviewStatus;
import java.time.Instant;

public record JoinLobbyStatusResponse(
    boolean admitted,
    Instant scheduledStart,
    InterviewStatus status
) {}
