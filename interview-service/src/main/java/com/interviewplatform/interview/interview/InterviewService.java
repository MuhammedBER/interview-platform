package com.interviewplatform.interview.interview;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.position.TemplateSegment;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import com.interviewplatform.interview.tenancy.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@Transactional
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final CandidateRepository candidateRepository;
    private final RecruiterRepository recruiterRepository;
    private final JobPositionRepository jobPositionRepository;
    private final InterviewMapper interviewMapper;
    private final TenantContext tenantContext;

    public InterviewService(InterviewRepository interviewRepository,
                            CandidateRepository candidateRepository,
                            RecruiterRepository recruiterRepository,
                            JobPositionRepository jobPositionRepository,
                            InterviewMapper interviewMapper,
                            TenantContext tenantContext) {
        this.interviewRepository = interviewRepository;
        this.candidateRepository = candidateRepository;
        this.recruiterRepository = recruiterRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.interviewMapper = interviewMapper;
        this.tenantContext = tenantContext;
    }

    public InterviewResponse schedule(ScheduleInterviewRequest request) {
        UUID organizationId = tenantContext.getOrganizationId();
        String subject = tenantContext.getKeycloakSubject();

        Recruiter recruiter = recruiterRepository
                .findByKeycloakSubjectAndOrganizationId(subject, organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "No recruiter profile for this user"));

        ScheduleInterviewRequest.CandidateInput input = request.candidate();
        Candidate candidate = candidateRepository
                .findByOrganizationIdAndEmail(organizationId, input.email())
                .orElseGet(() -> candidateRepository.save(toNewCandidate(organizationId, input)));

        Interview interview = new Interview(
                organizationId,
                recruiter.getId(),
                candidate.getId(),
                request.jobPositionId(),
                request.scheduledStart(),
                request.durationMinutes(),
                InterviewStatus.SCHEDULED);

        if (request.jobPositionId() != null) {
            JobPosition position = jobPositionRepository
                    .findByIdAndOrganizationId(request.jobPositionId(), organizationId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Position not found"));
            for (TemplateSegment template : position.getTemplates()) {
                interview.addSegment(interviewMapper.copyFromTemplate(template));
            }
        } else {
            if (request.segments() == null || request.segments().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "An interview with no position must include at least one segment");
            }
            for (ScheduleInterviewRequest.ScheduleSegmentInput seg : request.segments()) {
                interview.addSegment(interviewMapper.toNewSegment(seg));
            }
        }

        Interview saved = interviewRepository.save(interview);
        return interviewMapper.toResponse(saved);
    }

    private Candidate toNewCandidate(UUID organizationId,
                                     ScheduleInterviewRequest.CandidateInput input) {
        String phone = (input.phone() != null) ? input.phone() : "";
        return new Candidate(organizationId, input.firstName(), input.lastName(), input.email(), phone);
    }
}