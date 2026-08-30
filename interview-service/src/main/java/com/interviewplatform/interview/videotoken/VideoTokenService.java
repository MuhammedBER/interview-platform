package com.interviewplatform.interview.videotoken;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.config.ZegoProperties;
import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewRepository;
import com.interviewplatform.interview.interview.InterviewStatus;
import com.interviewplatform.interview.jointoken.JoinToken;
import com.interviewplatform.interview.jointoken.JoinTokenRepository;
import com.interviewplatform.interview.jointoken.JoinTokenService;
import com.interviewplatform.interview.jointoken.TokenStatus;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import com.interviewplatform.interview.tenancy.TenantContext;
import com.interviewplatform.interview.zego.token04.TokenServerAssistant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class VideoTokenService {

    private final ZegoProperties zegoProperties;
    private final InterviewRepository interviewRepository;
    private final JoinTokenRepository joinTokenRepository;
    private final RecruiterRepository recruiterRepository;
    private final CandidateRepository candidateRepository;
    private final TenantContext tenantContext;

    public VideoTokenService(ZegoProperties zegoProperties,
                             InterviewRepository interviewRepository,
                             JoinTokenRepository joinTokenRepository,
                             RecruiterRepository recruiterRepository,
                             CandidateRepository candidateRepository,
                             TenantContext tenantContext) {
        this.zegoProperties = zegoProperties;
        this.interviewRepository = interviewRepository;
        this.joinTokenRepository = joinTokenRepository;
        this.recruiterRepository = recruiterRepository;
        this.candidateRepository = candidateRepository;
        this.tenantContext = tenantContext;
    }

    public VideoTokenResponse recruiterVideoToken(UUID interviewId) {
        UUID organizationId = tenantContext.getOrganizationId();
        Interview interview = interviewRepository
                .findByIdAndOrganizationId(interviewId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Interview not found in your organisation"));

        if (!isMintable(interview)) {
            refuseStatus(interview.getStatus());
        }

        Recruiter recruiter = recruiterRepository
                .findByKeycloakSubjectAndOrganizationId(tenantContext.getKeycloakSubject(), organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "No recruiter profile for this user"));

        String userId = recruiter.getKeycloakSubject();
        String userName = (recruiter.getFirstName() + " " + recruiter.getLastName()).trim();
        return mint(interview, userId, userName);
    }

    public VideoTokenResponse candidateVideoToken(CandidateVideoTokenRequest request) {
        JoinToken token = resolveValidToken(request.joinToken());

        // REFUSAL: an unadmitted candidate must never receive a video token.
        Interview interview = token.getInterview();
        if (!interview.isAdmitted()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Candidate has not been admitted to this interview");
        }

        if (!isMintable(interview)) {
            refuseStatus(interview.getStatus());
        }

        Candidate candidate = candidateRepository.findById(interview.getCandidateId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Candidate not found"));

        String userId = interview.getCandidateId().toString();
        String userName = (candidate.getFirstName() + " " + candidate.getLastName()).trim();
        return mint(interview, userId, userName);
    }

    private JoinToken resolveValidToken(String rawToken) {
        String tokenHash = JoinTokenService.hashToken(rawToken);
        JoinToken token = joinTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid join token"));

        TokenStatus status = token.getStatus();
        if (status == TokenStatus.REVOKED
                || status == TokenStatus.USED
                || status == TokenStatus.EXPIRED) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Join token is " + status.name());
        }

        Instant now = Instant.now();
        if (now.isBefore(token.getValidFrom()) || now.isAfter(token.getValidUntil())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Join token is outside its validity window");
        }

        return token;
    }

    private boolean isMintable(Interview interview) {
        InterviewStatus status = interview.getStatus();
        return status != InterviewStatus.CANCELLED && status != InterviewStatus.COMPLETED;
    }

    private void refuseStatus(InterviewStatus status) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Video tokens cannot be issued for an interview that is " + status);
    }

    private VideoTokenResponse mint(Interview interview, String userId, String userName) {
        long appId = zegoProperties.appId();
        // The browser signals token expiry to the client; never force-disconnect
        // on expiry, so the client may simply request a fresh token.
        int effectiveTimeInSeconds = effectiveTimeSeconds(interview);

        String secret = zegoProperties.serverSecret();
        TokenServerAssistant.TokenInfo info = TokenServerAssistant.generateToken04(
                appId, userId, secret, effectiveTimeInSeconds, "");

        if (info.error.code != TokenServerAssistant.ErrorCode.SUCCESS) {
            throw new IllegalStateException(
                    "Failed to generate ZEGO video token (error code " + info.error.code + ")");
        }

        return new VideoTokenResponse(
                appId,
                info.data,
                interview.getId().toString(),
                userId,
                userName,
                effectiveTimeInSeconds);
    }

    private int effectiveTimeSeconds(Interview interview) {
        Instant validUntil = interview.getScheduledStart().plus(Duration.ofMinutes(30));
        long seconds = Duration.between(Instant.now(), validUntil).getSeconds();
        return (int) Math.max(seconds, 600);
    }
}
