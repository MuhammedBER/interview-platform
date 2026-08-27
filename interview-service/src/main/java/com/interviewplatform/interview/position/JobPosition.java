package com.interviewplatform.interview.position;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "job_position")
public class JobPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PositionStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<TemplateSegment> templates = new ArrayList<>();

    protected JobPosition() {
        // required by JPA
    }

    public JobPosition(UUID organizationId, String name, String description, PositionStatus status) {
        this.organizationId = organizationId;
        this.name = name;
        this.description = description;
        this.status = status;
    }

    // keep BOTH sides of the relationship consistent
    public void addTemplate(TemplateSegment template) {
        templates.add(template);
        template.setJobPosition(this);
    }

    public void removeTemplate(TemplateSegment template) {
        templates.remove(template);
        template.setJobPosition(null);
    }

    public void clearTemplates() {
        for (TemplateSegment template : new ArrayList<>(templates)) {
            removeTemplate(template);
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public PositionStatus getStatus() {
        return status;
    }

    public void setStatus(PositionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<TemplateSegment> getTemplates() {
        return templates;
    }
}