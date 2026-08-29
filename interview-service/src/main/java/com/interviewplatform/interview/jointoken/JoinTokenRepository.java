package com.interviewplatform.interview.jointoken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JoinTokenRepository extends JpaRepository<JoinToken, UUID> {
    List<JoinToken> findByInterviewIdAndStatus(UUID interviewId, TokenStatus status);
    Optional<JoinToken> findByTokenHash(String tokenHash);
}
