package com.interviewplatform.interview.interview;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {

    @Query("select distinct i from Interview i " +
            "left join fetch i.segments " +
            "where i.organizationId = :organizationId")
    List<Interview> findAllByOrganizationId(@Param("organizationId") UUID organizationId);

    @Query("select distinct i from Interview i " +
            "left join fetch i.segments " +
            "where i.id = :id and i.organizationId = :organizationId")
    Optional<Interview> findByIdAndOrganizationId(@Param("id") UUID id,
                                                  @Param("organizationId") UUID organizationId);
}