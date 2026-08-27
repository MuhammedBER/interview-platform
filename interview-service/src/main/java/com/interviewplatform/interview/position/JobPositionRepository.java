package com.interviewplatform.interview.position;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobPositionRepository extends JpaRepository<JobPosition, UUID> {

  @Query("select distinct p from JobPosition p " +
          "left join fetch p.templates " +
          "where p.organizationId = :organizationId")
  List<JobPosition> findAllByOrganizationId(@Param("organizationId") UUID organizationId);

  @Query("select distinct p from JobPosition p " +
          "left join fetch p.templates " +
          "where p.id = :id and p.organizationId = :organizationId")
  Optional<JobPosition> findByIdAndOrganizationId(@Param("id") UUID id,
                                                  @Param("organizationId") UUID organizationId);
}