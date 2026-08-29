package com.interviewplatform.interview.publicjoin;

import java.time.Instant;

public record JoinTokenValidationResponse(
    String interviewTitle,
    Instant scheduledStart,
    int durationMinutes,
    String recruiterName,
    String candidateName
) {}
