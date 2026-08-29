package com.interviewplatform.interview.jointoken;

import com.interviewplatform.interview.interview.Interview;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "join_token")
public class JoinToken {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "interview_id", nullable = false)
  private Interview interview;

  @Column(name = "token_hash", nullable = false, unique = true, length = 64)
  private String tokenHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TokenStatus status;

  @Column(name = "valid_from", nullable = false)
  private Instant validFrom;

  @Column(name = "valid_until", nullable = false)
  private Instant validUntil;

  @Column(name = "used_at")
  private Instant usedAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  public JoinToken() {}

  public JoinToken(
      Interview interview,
      String tokenHash,
      TokenStatus status,
      Instant validFrom,
      Instant validUntil) {
    this.interview = interview;
    this.tokenHash = tokenHash;
    this.status = status;
    this.validFrom = validFrom;
    this.validUntil = validUntil;
  }

  public UUID getId() {
    return id;
  }

  public Interview getInterview() {
    return interview;
  }

  public String getTokenHash() {
    return tokenHash;
  }

  public TokenStatus getStatus() {
    return status;
  }

  public void setStatus(TokenStatus status) {
    this.status = status;
  }

  public Instant getValidFrom() {
    return validFrom;
  }

  public Instant getValidUntil() {
    return validUntil;
  }

  public Instant getUsedAt() {
    return usedAt;
  }

  public void setUsedAt(Instant usedAt) {
    this.usedAt = usedAt;
  }

  public Instant getRevokedAt() {
    return revokedAt;
  }

  public void setRevokedAt(Instant revokedAt) {
    this.revokedAt = revokedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
