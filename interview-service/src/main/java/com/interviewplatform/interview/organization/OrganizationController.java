package com.interviewplatform.interview.organization;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizations")
public class OrganizationController {
    private  final OrganizationService organizationService;
    public OrganizationController (OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping("/current")
    public OrganizationResponse getCurrentOrganization() {
        return organizationService.getCurrentOrganization();
    }
}
