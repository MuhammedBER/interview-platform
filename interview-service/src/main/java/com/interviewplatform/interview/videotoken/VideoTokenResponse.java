package com.interviewplatform.interview.videotoken;

public record VideoTokenResponse(
    long appId,
    String token,
    String roomId,
    String userId,
    String userName,
    int expiresInSeconds
) {}
