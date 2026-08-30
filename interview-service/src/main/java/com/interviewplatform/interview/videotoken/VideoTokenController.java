package com.interviewplatform.interview.videotoken;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class VideoTokenController {

    private final VideoTokenService videoTokenService;

    public VideoTokenController(VideoTokenService videoTokenService) {
        this.videoTokenService = videoTokenService;
    }

    @PostMapping("/api/interviews/{interviewId}/video-token")
    public VideoTokenResponse recruiterVideoToken(@PathVariable UUID interviewId) {
        return videoTokenService.recruiterVideoToken(interviewId);
    }

    @PostMapping("/api/public/video-token")
    public VideoTokenResponse candidateVideoToken(@Valid @RequestBody CandidateVideoTokenRequest request) {
        return videoTokenService.candidateVideoToken(request);
    }
}
