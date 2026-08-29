package com.interviewplatform.interview.publicjoin;

import java.time.Instant;

public record JoinLobbyStatusResponse(
    boolean admitted,
    Instant scheduledStart
) {}
