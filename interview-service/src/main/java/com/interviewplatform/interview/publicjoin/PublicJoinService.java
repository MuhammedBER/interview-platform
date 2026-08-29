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
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Optional<JoinToken> tokenOptional = joinTokenRepository.findByTokenHash(tokenHash);

    if (tokenOptional.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .body(new JoinTokenRefusalResponse("NOT_FOUND"));
    }

    JoinToken token = tokenOptional.get();
    TokenStatus status = token.getStatus();

    if (status == TokenStatus.REVOKED) {
      return ResponseEntity.status(HttpStatus.GONE)
          .body(new JoinTokenRefusalResponse("REVOKED"));
    }
    if (status == TokenStatus.USED) {
      return ResponseEntity.status(HttpStatus.GONE)
          .body(new JoinTokenRefusalResponse("USED"));
    }
    if (status == TokenStatus.EXPIRED) {
      return ResponseEntity.status(HttpStatus.GONE)
          .body(new JoinTokenRefusalResponse("EXPIRED"));
    }

    Instant now = Instant.now();
    if (now.isBefore(token.getValidFrom()) || now.isAfter(token.getValidUntil())) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(new JoinTokenRefusalResponse("OUTSIDE_WINDOW"));
    }

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
}
