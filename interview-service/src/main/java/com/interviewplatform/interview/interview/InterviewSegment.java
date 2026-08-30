package com.interviewplatform.interview.interview;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_segment")
public class InterviewSegment {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "interview_id", nullable = false)
  private Interview interview;

  @Column(nullable = false)
  private String title;

  @Column(name = "order_index", nullable = false)
  private int orderIndex;

  @Column(name = "planned_minutes", nullable = false)
  private int plannedMinutes;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "prepared_questions", nullable = false, columnDefinition = "jsonb")
  private List<String> preparedQuestions = new ArrayList<>();

  @Column(name = "actual_start")
  private Instant actualStart;

  @Column(name = "actual_end")
  private Instant actualEnd;

  public InterviewSegment() {}

  public InterviewSegment(
      String title, int orderIndex, int plannedMinutes, List<String> preparedQuestions) {
    this.title = title;
    this.orderIndex = orderIndex;
    this.plannedMinutes = plannedMinutes;
    this.preparedQuestions = preparedQuestions != null ? preparedQuestions : new ArrayList<>();
  }

  public void setInterview(Interview interview) {
    this.interview = interview;
  }

  public UUID getId() {
    return id;
  }

  public Interview getInterview() {
    return interview;
  }

  public String getTitle() {
    return title;
  }

  public int getOrderIndex() {
    return orderIndex;
  }

  public int getPlannedMinutes() {
    return plannedMinutes;
  }

  public List<String> getPreparedQuestions() {
    return preparedQuestions;
  }

  public Instant getActualStart() {
    return actualStart;
  }

  public void setActualStart(Instant actualStart) {
    this.actualStart = actualStart;
  }

  public Instant getActualEnd() {
    return actualEnd;
  }

  public void setActualEnd(Instant actualEnd) {
    this.actualEnd = actualEnd;
  }
}
