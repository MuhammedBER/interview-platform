package com.interviewplatform.interview.jointoken;

import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JoinTokenServiceTest {

  @Mock
  private JoinTokenRepository joinTokenRepository;

  private JoinTokenService joinTokenService;

  @BeforeEach
  void setUp() {
    joinTokenService = new JoinTokenService(joinTokenRepository);
  }

  @Test
  void generateJoinToken_createsPendingTokenWithCorrectValidityAndHash() {
    // Arrange
    Instant scheduledStart = Instant.parse("2026-09-01T10:00:00Z");
    Interview interview = new Interview(
        UUID.randomUUID(),
        UUID.randomUUID(),
        UUID.randomUUID(),
        UUID.randomUUID(),
        scheduledStart,
        60,
        InterviewStatus.SCHEDULED
    );

    // Act
    String rawToken = joinTokenService.generateJoinToken(interview);

    // Assert
    assertThat(rawToken).isNotBlank();

    ArgumentCaptor<JoinToken> tokenCaptor = ArgumentCaptor.forClass(JoinToken.class);
    verify(joinTokenRepository).save(tokenCaptor.capture());

    JoinToken savedToken = tokenCaptor.getValue();
    assertThat(savedToken).isNotNull();
    assertThat(savedToken.getStatus()).isEqualTo(TokenStatus.PENDING);

    String expectedHash = JoinTokenService.hashToken(rawToken);
    assertThat(savedToken.getTokenHash()).isEqualTo(expectedHash);
    assertThat(savedToken.getTokenHash()).hasSize(64);
    assertThat(savedToken.getTokenHash()).matches("^[0-9a-f]{64}$");

    assertThat(savedToken.getValidFrom()).isEqualTo(scheduledStart.minus(Duration.ofMinutes(15)));
    assertThat(savedToken.getValidUntil()).isEqualTo(scheduledStart.plus(Duration.ofMinutes(30)));

    assertThat(savedToken.getUsedAt()).isNull();
    assertThat(savedToken.getRevokedAt()).isNull();
  }

  @Test
  void revokeActiveTokens_flipsPendingTokensToRevokedAndStampsRevokedAt() {
    // Arrange
    Interview interview = new Interview(
        UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
        Instant.now(), 60, InterviewStatus.SCHEDULED
    );

    JoinToken token = new JoinToken(interview, "hash123", TokenStatus.PENDING, Instant.now(), Instant.now().plusSeconds(3600));
    when(joinTokenRepository.findByInterviewIdAndStatus(interview.getId(), TokenStatus.PENDING))
        .thenReturn(List.of(token));

    // Act
    joinTokenService.revokeActiveTokens(interview);

    // Assert
    assertThat(token.getStatus()).isEqualTo(TokenStatus.REVOKED);
    assertThat(token.getRevokedAt()).isNotNull();

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<JoinToken>> listCaptor = ArgumentCaptor.forClass(List.class);
    verify(joinTokenRepository).saveAll(listCaptor.capture());
    assertThat(listCaptor.getValue()).containsExactly(token);
  }

  @Test
  void regenerateJoinToken_revokesOldTokensAndGeneratesNewPendingToken() {
    // Arrange
    Instant scheduledStart = Instant.parse("2026-09-01T10:00:00Z");
    Interview interview = new Interview(
        UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
        scheduledStart, 60, InterviewStatus.SCHEDULED
    );

    JoinToken oldToken = new JoinToken(interview, "oldhash", TokenStatus.PENDING, Instant.now(), Instant.now().plusSeconds(3600));
    when(joinTokenRepository.findByInterviewIdAndStatus(interview.getId(), TokenStatus.PENDING))
        .thenReturn(List.of(oldToken));

    // Act
    String newRawToken = joinTokenService.regenerateJoinToken(interview);

    // Assert
    assertThat(newRawToken).isNotBlank();
    assertThat(oldToken.getStatus()).isEqualTo(TokenStatus.REVOKED);
    assertThat(oldToken.getRevokedAt()).isNotNull();

    ArgumentCaptor<JoinToken> newSavedCaptor = ArgumentCaptor.forClass(JoinToken.class);
    verify(joinTokenRepository).save(newSavedCaptor.capture());
    JoinToken newToken = newSavedCaptor.getValue();
    assertThat(newToken.getStatus()).isEqualTo(TokenStatus.PENDING);
    assertThat(newToken.getTokenHash()).isEqualTo(JoinTokenService.hashToken(newRawToken));
  }
}
