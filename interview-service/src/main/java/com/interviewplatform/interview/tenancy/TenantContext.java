package com.interviewplatform.interview.tenancy;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class TenantContext {

    private static final String ORG_CLAIM = "organization_id";

    public UUID getOrganizationId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("No authenticated JWT in the security context");
        }

        String organizationId = jwt.getClaimAsString(ORG_CLAIM);
        if (organizationId == null || organizationId.isBlank()) {
            throw new IllegalStateException("Token is missing the '" + ORG_CLAIM + "' claim");
        }

        return UUID.fromString(organizationId);
    }

    public String getKeycloakSubject() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("No authenticated JWT in the security context");
        }

        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalStateException("Token is missing the subject (sub) claim");
        }

        return subject;
    }
}