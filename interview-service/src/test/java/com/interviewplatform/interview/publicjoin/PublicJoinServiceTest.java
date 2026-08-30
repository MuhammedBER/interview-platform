package com.interviewplatform.interview.publicjoin;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewStatus;
import com.interviewplatform.interview.jointoken.JoinToken;
import com.interviewplatform.interview.jointoken.JoinTokenRepository;
import com.interviewplatform.interview.jointoken.JoinTokenService;
import com.interviewplatform.interview.jointoken.TokenStatus;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.position.PositionStatus;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicJoinServiceTest {

  @Mock private JoinTokenRepository joinTokenRepository;
  @Mock private CandidateRepository candidateRepository;
  @Mock private RecruiterRepository recruiterRepository;
  @Mock private JobPositionRepository jobPositionRepository;

  private PublicJoinService publicJoinService;

  @BeforeEach
  void setUp() {
    publicJoinService = new PublicJoinService(
        joinTokenRepository,
        candidateRepository,
        recruiterRepository,
        jobPositionRepository
    );
  }

  @Test
  void validateToken_whenNotFound_returns404WithNotFoundReason() {
    String rawToken = "raw-nonexistent-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("NOT_FOUND"));
  }

  @Test
  void validateToken_whenRevoked_returns410WithRevokedReason() {
    String rawToken = "raw-revoked-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Interview interview = createSampleInterview();
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.REVOKED, Instant.now().minusSeconds(600), Instant.now().plusSeconds(600));

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GONE);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("REVOKED"));
  }

  @Test
  void validateToken_whenUsed_returns410WithUsedReason() {
    String rawToken = "raw-used-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Interview interview = createSampleInterview();
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.USED, Instant.now().minusSeconds(600), Instant.now().plusSeconds(600));

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GONE);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("USED"));
  }

  @Test
  void validateToken_whenExpired_returns410WithExpiredReason() {
    String rawToken = "raw-expired-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Interview interview = createSampleInterview();
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.EXPIRED, Instant.now().minusSeconds(600), Instant.now().plusSeconds(600));

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GONE);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("EXPIRED"));
  }

  @Test
  void validateToken_whenBeforeValidFrom_returns403WithOutsideWindowReason() {
    String rawToken = "raw-future-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Interview interview = createSampleInterview();
    Instant futureStart = Instant.now().plusSeconds(3600);
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.PENDING, futureStart, futureStart.plusSeconds(1800));

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("OUTSIDE_WINDOW"));
  }

  @Test
  void validateToken_whenAfterValidUntil_returns403WithOutsideWindowReason() {
    String rawToken = "raw-past-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Interview interview = createSampleInterview();
    Instant pastFrom = Instant.now().minusSeconds(3600);
    Instant pastUntil = Instant.now().minusSeconds(1800);
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.PENDING, pastFrom, pastUntil);

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("OUTSIDE_WINDOW"));
  }

  @Test
  void validateToken_whenValidPendingWithinWindow_returns200WithValidationResponse() {
    String rawToken = "raw-valid-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    UUID orgId = UUID.randomUUID();
    UUID posId = UUID.randomUUID();

    Candidate candidate = new Candidate(orgId, "Alice", "Candidate", "alice@example.com", "+12345");
    Recruiter recruiter = new Recruiter(orgId, "rec-sub", "Bob", "Recruiter", "bob@example.com");
    JobPosition position = new JobPosition(orgId, "Backend Engineer", "Desc", PositionStatus.ACTIVE);

    Instant now = Instant.now();
    Interview interview = new Interview(orgId, recruiter.getId(), candidate.getId(), posId, now, 60, InterviewStatus.SCHEDULED);
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.PENDING, now.minusSeconds(300), now.plusSeconds(300));

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
    when(jobPositionRepository.findById(posId)).thenReturn(Optional.of(position));
    when(candidateRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
    when(recruiterRepository.findById(recruiter.getId())).thenReturn(Optional.of(recruiter));

    ResponseEntity<?> response = publicJoinService.validateToken(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isInstanceOf(JoinTokenValidationResponse.class);

    JoinTokenValidationResponse body = (JoinTokenValidationResponse) response.getBody();
    assertThat(body.interviewTitle()).isEqualTo("Backend Engineer");
    assertThat(body.scheduledStart()).isEqualTo(now);
    assertThat(body.durationMinutes()).isEqualTo(60);
    assertThat(body.recruiterName()).isEqualTo("Bob Recruiter");
    assertThat(body.candidateName()).isEqualTo("Alice Candidate");
  }

  @Test
  void getLobbyStatus_whenRefused_returnsSameRefusalResponse() {
    String rawToken = "raw-revoked-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Interview interview = createSampleInterview();
    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.REVOKED, Instant.now().minusSeconds(600), Instant.now().plusSeconds(600));

    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.getLobbyStatus(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GONE);
    assertThat(response.getBody()).isEqualTo(new JoinTokenRefusalResponse("REVOKED"));
  }

  @Test
  void getLobbyStatus_whenValidBeforeAdmit_returns200WithAdmittedFalse() {
    String rawToken = "raw-valid-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Instant scheduledStart = Instant.now();
    Interview interview = new Interview(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null, scheduledStart, 60, InterviewStatus.SCHEDULED);
    assertThat(interview.isAdmitted()).isFalse();

    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.PENDING, scheduledStart.minusSeconds(300), scheduledStart.plusSeconds(300));
    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.getLobbyStatus(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isEqualTo(new JoinLobbyStatusResponse(false, scheduledStart, interview.getStatus()));
  }

  @Test
  void getLobbyStatus_whenValidAfterAdmit_returns200WithAdmittedTrue() {
    String rawToken = "raw-valid-token";
    String tokenHash = JoinTokenService.hashToken(rawToken);
    Instant scheduledStart = Instant.now();
    Interview interview = new Interview(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null, scheduledStart, 60, InterviewStatus.SCHEDULED);
    interview.setAdmitted(true);

    JoinToken token = new JoinToken(interview, tokenHash, TokenStatus.PENDING, scheduledStart.minusSeconds(300), scheduledStart.plusSeconds(300));
    when(joinTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

    ResponseEntity<?> response = publicJoinService.getLobbyStatus(rawToken);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isEqualTo(new JoinLobbyStatusResponse(true, scheduledStart, interview.getStatus()));
  }

  private Interview createSampleInterview() {
    return new Interview(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null, Instant.now(), 60, InterviewStatus.SCHEDULED);
  }
}
