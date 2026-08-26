package com.interviewplatform.interview.organization;

import com.interviewplatform.interview.tenancy.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final TenantContext tenantContext;

    public OrganizationService(OrganizationRepository organizationRepository,
                               TenantContext tenantContext) {
        this.organizationRepository = organizationRepository;
        this.tenantContext = tenantContext;
    }

    public OrganizationResponse getCurrentOrganization() {
        UUID organizationId = tenantContext.getOrganizationId();   // ← from the TOKEN only
        return organizationRepository.findById(organizationId)
                .map(org -> new OrganizationResponse(org.getId(), org.getName(), org.getCreatedAt()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No organisation found for this token"));
    }
}