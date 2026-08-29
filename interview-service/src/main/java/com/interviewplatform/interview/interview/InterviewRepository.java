package com.interviewplatform.interview.interview;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
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

    @Query("select i from Interview i " +
            "where i.status = com.interviewplatform.interview.interview.InterviewStatus.SCHEDULED " +
            "and i.reminder24hSentAt is null " +
            "and i.scheduledStart >= :from and i.scheduledStart <= :to")
    List<Interview> findDueFor24hReminder(@Param("from") Instant from,
                                          @Param("to") Instant to);

    @Query("select i from Interview i " +
            "where i.status = com.interviewplatform.interview.interview.InterviewStatus.SCHEDULED " +
            "and i.reminder1hSentAt is null " +
            "and i.scheduledStart >= :from and i.scheduledStart <= :to")
    List<Interview> findDueFor1hReminder(@Param("from") Instant from,
                                         @Param("to") Instant to);
}