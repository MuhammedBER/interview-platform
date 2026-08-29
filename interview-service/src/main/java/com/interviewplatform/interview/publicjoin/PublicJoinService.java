package com.interviewplatform.interview.publicjoin;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.jointoken.JoinToken;
import com.interviewplatform.interview.jointoken.JoinTokenRepository;
import com.interviewplatform.interview.jointoken.JoinTokenService;
import com.interviewplatform.interview.jointoken.TokenStatus;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class PublicJoinService {

  private final JoinTokenRepository joinTokenRepository;
  private final CandidateRepository candidateRepository;
  private final RecruiterRepository recruiterRepository;
  private final JobPositionRepository jobPositionRepository;

  public PublicJoinService(
      JoinTokenRepository joinTokenRepository,
      CandidateRepository candidateRepository,
      RecruiterRepository recruiterRepository,
      JobPositionRepository jobPositionRepository) {
    this.joinTokenRepository = joinTokenRepository;
    this.candidateRepository = candidateRepository;
    this.recruiterRepository = recruiterRepository;
    this.jobPositionRepository = jobPositionRepository;
  }

  public ResponseEntity<?> validateToken(String rawToken) {
    TokenResolution resolution = resolveToken(rawToken);
    if (resolution.isRefused()) {
      return resolution.getRefusal();
    }

    JoinToken token = resolution.getToken();
    Interview interview = token.getInterview();

    String interviewTitle = "Interview";
    if (interview.getJobPositionId() != null) {
      interviewTitle = jobPositionRepository.findById(interview.getJobPositionId())
          .map(JobPosition::getName)
          .orElse("Interview");
    }

    Candidate candidate = candidateRepository.findById(interview.getCandidateId()).orElse(null);
    String candidateName = (candidate != null)
        ? (candidate.getFirstName() + " " + candidate.getLastName()).trim() : "";

    Recruiter recruiter = recruiterRepository.findById(interview.getRecruiterId()).orElse(null);
    String recruiterName = (recruiter != null)
        ? (recruiter.getFirstName() + " " + recruiter.getLastName()).trim() : "";

    JoinTokenValidationResponse response = new JoinTokenValidationResponse(
        interviewTitle,
        interview.getScheduledStart(),
        interview.getDurationMinutes(),
        recruiterName,
        candidateName
    );

    return ResponseEntity.ok(response);
  }

  public ResponseEntity<?> getLobbyStatus(String rawToken) {
    TokenResolution resolution = resolveToken(rawToken);
    if (resolution.isRefused()) {
      return resolution.getRefusal();
    }

    JoinToken token = resolution.getToken();
    Interview interview = token.getInterview();

    JoinLobbyStatusResponse response = new JoinLobbyStatusResponse(
        interview.isAdmitted(),
        interview.getScheduledStart()
    );

    return ResponseEntity.ok(response);
  }

  private TokenResolution resolveToken(String rawToken) {
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Optional<JoinToken> tokenOptional = joinTokenRepository.findByTokenHash(tokenHash);

    if (tokenOptional.isEmpty()) {
      return TokenResolution.refusal(HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    JoinToken token = tokenOptional.get();
    TokenStatus status = token.getStatus();

    if (status == TokenStatus.REVOKED) {
      return TokenResolution.refusal(HttpStatus.GONE, "REVOKED");
    }
    if (status == TokenStatus.USED) {
      return TokenResolution.refusal(HttpStatus.GONE, "USED");
    }
    if (status == TokenStatus.EXPIRED) {
      return TokenResolution.refusal(HttpStatus.GONE, "EXPIRED");
    }

    Instant now = Instant.now();
    if (now.isBefore(token.getValidFrom()) || now.isAfter(token.getValidUntil())) {
      return TokenResolution.refusal(HttpStatus.FORBIDDEN, "OUTSIDE_WINDOW");
    }

    return TokenResolution.success(token);
  }

  private static class TokenResolution {
    private final JoinToken token;
    private final ResponseEntity<JoinTokenRefusalResponse> refusal;

    private TokenResolution(JoinToken token, ResponseEntity<JoinTokenRefusalResponse> refusal) {
      this.token = token;
      this.refusal = refusal;
    }

    public static TokenResolution success(JoinToken token) {
      return new TokenResolution(token, null);
    }

    public static TokenResolution refusal(HttpStatus status, String reason) {
      return new TokenResolution(null, ResponseEntity.status(status).body(new JoinTokenRefusalResponse(reason)));
    }

    public boolean isRefused() {
      return refusal != null;
    }

    public ResponseEntity<JoinTokenRefusalResponse> getRefusal() {
      return refusal;
    }

    public JoinToken getToken() {
      return token;
    }
  }
}
