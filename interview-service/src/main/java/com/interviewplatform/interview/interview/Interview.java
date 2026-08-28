package com.interviewplatform.interview.interview;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview")
public class Interview {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "recruiter_id", nullable = false)
  private UUID recruiterId;

  @Column(name = "candidate_id", nullable = false)
  private UUID candidateId;

  @Column(name = "job_position_id") // nullable on purpose
  private UUID jobPositionId;

  @Column(name = "scheduled_start", nullable = false)
  private Instant scheduledStart;

  @Column(name = "duration_minutes", nullable = false)
  private int durationMinutes;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private InterviewStatus status;

  @Column(nullable = false)
  private boolean admitted = false;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;

  @Column(name = "reminder24h_sent_at")
  private Instant reminder24hSentAt;

  @Column(name = "reminder1h_sent_at")
  private Instant reminder1hSentAt;

  @OneToMany(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("orderIndex ASC")
  private List<InterviewSegment> segments = new ArrayList<>();

  public Interview() {}

  public Interview(
      UUID organizationId,
      UUID recruiterId,
      UUID candidateId,
      UUID jobPositionId,
      Instant scheduledStart,
      int durationMinutes,
      InterviewStatus status) {
    this.organizationId = organizationId;
    this.recruiterId = recruiterId;
    this.candidateId = candidateId;
    this.jobPositionId = jobPositionId;
    this.scheduledStart = scheduledStart;
    this.durationMinutes = durationMinutes;
    this.status = status;
  }

  public void addSegment(InterviewSegment segment) {
    segments.add(segment);
    segment.setInterview(this);
  }

  public void removeSegment(InterviewSegment segment) {
    segments.remove(segment);
    segment.setInterview(null);
  }

  public void setStatus(InterviewStatus status) {
    this.status = status;
  }

  public void setScheduledStart(Instant scheduledStart) {
    this.scheduledStart = scheduledStart;
  }

  public void setDurationMinutes(int durationMinutes) {
    this.durationMinutes = durationMinutes;
  }

  public void setCancelledAt(Instant cancelledAt) {
    this.cancelledAt = cancelledAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getRecruiterId() {
    return recruiterId;
  }

  public Instant getReminder1hSentAt() {
    return reminder1hSentAt;
  }

  public Instant getCancelledAt() {
    return cancelledAt;
  }

  public boolean isAdmitted() {
    return admitted;
  }

  public int getDurationMinutes() {
    return durationMinutes;
  }

  public InterviewStatus getStatus() {
    return status;
  }

  public Instant getScheduledStart() {
    return scheduledStart;
  }

  public UUID getJobPositionId() {
    return jobPositionId;
  }

  public UUID getCandidateId() {
    return candidateId;
  }

  public UUID getOrganizationId() {
    return organizationId;
  }

  public Instant getReminder24hSentAt() {
    return reminder24hSentAt;
  }

  public List<InterviewSegment> getSegments() {
    return segments;
  }
}
