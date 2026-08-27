package com.interviewplatform.interview.position;

import com.interviewplatform.interview.tenancy.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PositionService {

    private final JobPositionRepository jobPositionRepository;
    private final PositionMapper positionMapper;
    private final TenantContext tenantContext;

    public PositionService(JobPositionRepository jobPositionRepository,
                           PositionMapper positionMapper,
                           TenantContext tenantContext) {
        this.jobPositionRepository = jobPositionRepository;
        this.positionMapper = positionMapper;
        this.tenantContext = tenantContext;
    }

    public PositionResponse create(PositionRequest request) {
        UUID organizationId = tenantContext.getOrganizationId();          // from the TOKEN
        JobPosition position = positionMapper.toNewPosition(request, organizationId);
        JobPosition saved = jobPositionRepository.save(position);
        return positionMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> list() {
        UUID organizationId = tenantContext.getOrganizationId();          // scoped read
        return jobPositionRepository.findAllByOrganizationId(organizationId).stream()
                .map(positionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PositionResponse get(UUID id) {
        UUID organizationId = tenantContext.getOrganizationId();
        JobPosition position = jobPositionRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Position not found"));
        return positionMapper.toResponse(position);
    }

    public PositionResponse update(UUID id, PositionRequest request) {
        UUID organizationId = tenantContext.getOrganizationId();
        JobPosition position = jobPositionRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Position not found"));

        position.setName(request.name());
        position.setDescription(request.description());
        position.setStatus(request.status());

        position.clearTemplates();
        if (request.templates() != null) {
            for (TemplateSegmentRequest segment : request.templates()) {
                position.addTemplate(positionMapper.toNewSegment(segment));
            }
        }

        return positionMapper.toResponse(position);
    }
}