package com.interviewplatform.interview.videotoken;

import jakarta.validation.constraints.NotBlank;

public record CandidateVideoTokenRequest(
    @NotBlank(message = "joinToken is required") String joinToken
) {}
