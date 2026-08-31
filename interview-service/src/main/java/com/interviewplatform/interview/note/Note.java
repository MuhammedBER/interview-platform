package com.interviewplatform.interview.note;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "note")
public class Note {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "interview_id", nullable = false)
  private UUID interviewId;

  @Column(name = "segment_id")
  private UUID segmentId;

  @Column(nullable = false)
  private String content;

  @Column(name = "elapsed_seconds", nullable = false)
  private int elapsedSeconds;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Note() {}

  public Note(
      UUID interviewId,
      UUID segmentId,
      String content,
      int elapsedSeconds,
      Instant createdAt,
      Instant updatedAt) {
    this.interviewId = interviewId;
    this.segmentId = segmentId;
    this.content = content;
    this.elapsedSeconds = elapsedSeconds;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getInterviewId() {
    return interviewId;
  }

  public UUID getSegmentId() {
    return segmentId;
  }

  public String getContent() {
    return content;
  }

  public int getElapsedSeconds() {
    return elapsedSeconds;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
