package com.interviewplatform.interview.recruiter;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecruiterRepository extends JpaRepository<Recruiter, UUID> {
    Optional<Recruiter> findByIdAndOrganizationId(UUID id, UUID organizationId);
    List<Recruiter> findAllByOrganizationId(UUID organizationId);
    Optional<Recruiter> findByKeycloakSubject(String keycloakSubject);
}
