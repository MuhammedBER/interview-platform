package com.interviewplatform.interview.position;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "template_segment")
public class TemplateSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_position_id", nullable = false)
    private JobPosition jobPosition;

    @Column(nullable = false)
    private String title;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "planned_minutes", nullable = false)
    private int plannedMinutes;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_questions", nullable = false, columnDefinition = "jsonb")
    private List<String> defaultQuestions = new ArrayList<>();

    protected TemplateSegment() {
    }

    public TemplateSegment(String title, int orderIndex, int plannedMinutes, List<String> defaultQuestions) {
        this.title = title;
        this.orderIndex = orderIndex;
        this.plannedMinutes = plannedMinutes;
        this.defaultQuestions = (defaultQuestions != null) ? defaultQuestions : new ArrayList<>();
    }

    void setJobPosition(JobPosition jobPosition) {
        this.jobPosition = jobPosition;
    }

    public UUID getId() {
        return id;
    }

    public JobPosition getJobPosition() {
        return jobPosition;
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

    public List<String> getDefaultQuestions() {
        return defaultQuestions;
    }

}
