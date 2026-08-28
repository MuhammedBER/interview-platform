package com.interviewplatform.interview.candidate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {
    Optional<Candidate> findByIdAndOrganizationId(UUID id, UUID organizationId);
    List<Candidate> findAllByOrganizationId(UUID organizationId);
    Optional<Candidate> findByOrganizationIdAndEmail(UUID organizationId, String email);
}