package com.interviewplatform.interview.jointoken;

import com.interviewplatform.interview.interview.Interview;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class JoinTokenService {

  private final JoinTokenRepository joinTokenRepository;
  private final SecureRandom secureRandom = new SecureRandom();

  public JoinTokenService(JoinTokenRepository joinTokenRepository) {
    this.joinTokenRepository = joinTokenRepository;
  }

  @Transactional
  public String generateJoinToken(Interview interview) {
    byte[] randomBytes = new byte[32];
    secureRandom.nextBytes(randomBytes);
    String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

    String tokenHash = hashToken(rawToken);

    Instant scheduledStart = interview.getScheduledStart();
    Instant validFrom = scheduledStart.minus(Duration.ofMinutes(15));
    Instant validUntil = scheduledStart.plus(Duration.ofMinutes(30));

    JoinToken joinToken = new JoinToken(
        interview,
        tokenHash,
        TokenStatus.PENDING,
        validFrom,
        validUntil
    );

    joinTokenRepository.save(joinToken);

    return rawToken;
  }

  @Transactional
  public void revokeActiveTokens(Interview interview) {
    List<JoinToken> pendingTokens = joinTokenRepository
        .findByInterviewIdAndStatus(interview.getId(), TokenStatus.PENDING);
    if (!pendingTokens.isEmpty()) {
      Instant now = Instant.now();
      for (JoinToken token : pendingTokens) {
        token.setStatus(TokenStatus.REVOKED);
        token.setRevokedAt(now);
      }
      joinTokenRepository.saveAll(pendingTokens);
    }
  }

  @Transactional
  public String regenerateJoinToken(Interview interview) {
    revokeActiveTokens(interview);
    return generateJoinToken(interview);
  }

  public static String hashToken(String rawToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hashBytes);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 algorithm not available", e);
    }
  }
}
