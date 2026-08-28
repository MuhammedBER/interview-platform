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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

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

        if (request.segments() != null && !request.segments().isEmpty()) {
            // The recruiter supplied an explicit segment list (e.g. copied from a
            // position's templates and then edited/reordered in the schedule form).
            // Honour the recruiter's snapshot rather than re-copying from the position.
            for (ScheduleInterviewRequest.ScheduleSegmentInput seg : request.segments()) {
                interview.addSegment(interviewMapper.toNewSegment(seg));
            }
        } else if (request.jobPositionId() != null) {
            // No explicit segments: copy-on-apply from the position's current templates.
            JobPosition position = jobPositionRepository
                    .findByIdAndOrganizationId(request.jobPositionId(), organizationId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Position not found"));
            for (TemplateSegment template : position.getTemplates()) {
                interview.addSegment(interviewMapper.copyFromTemplate(template));
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "An interview with no position must include at least one segment");
        }

        Interview saved = interviewRepository.save(interview);
        return interviewMapper.toResponse(saved);
    }

    private Candidate toNewCandidate(UUID organizationId,
                                     ScheduleInterviewRequest.CandidateInput input) {
        String phone = (input.phone() != null) ? input.phone() : "";
        return new Candidate(organizationId, input.firstName(), input.lastName(), input.email(), phone);
    }

    @Transactional(readOnly = true)
    public List<InterviewListItemResponse> list(InterviewStatus statusOrNull) {
        UUID organizationId = tenantContext.getOrganizationId();

        Map<UUID, Candidate> candidatesById = candidateRepository
                .findAllByOrganizationId(organizationId).stream()
                .collect(Collectors.toMap(Candidate::getId, Function.identity()));
        Map<UUID, JobPosition> positionsById = jobPositionRepository
                .findAllByOrganizationId(organizationId).stream()
                .collect(Collectors.toMap(JobPosition::getId, Function.identity()));

        return interviewRepository.findAllByOrganizationId(organizationId).stream()
                .filter(interview -> statusOrNull == null || interview.getStatus() == statusOrNull)
                .map(interview -> toListItem(interview, candidatesById, positionsById))
                .toList();
    }

    private InterviewListItemResponse toListItem(Interview interview,
                                                 Map<UUID, Candidate> candidatesById,
                                                 Map<UUID, JobPosition> positionsById) {
        Candidate candidate = candidatesById.get(interview.getCandidateId());
        String candidateName = (candidate == null) ? null
                : (candidate.getFirstName() + " " + candidate.getLastName()).trim();
        String candidateEmail = (candidate == null) ? null : candidate.getEmail();

        String positionName = null;
        if (interview.getJobPositionId() != null) {
            JobPosition position = positionsById.get(interview.getJobPositionId());
            if (position != null) {
                positionName = position.getName();
            }
        }

        return new InterviewListItemResponse(
                interview.getId(),
                candidateName,
                candidateEmail,
                positionName,
                interview.getScheduledStart(),
                interview.getDurationMinutes(),
                interview.getSegments().size(),
                interview.getStatus());
    }

    @Transactional(readOnly = true)
    public InterviewResponse get(UUID id) {
        UUID organizationId = tenantContext.getOrganizationId();
        Interview interview = interviewRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Interview not found"));
        return interviewMapper.toResponse(interview);
    }

    public InterviewResponse reschedule(UUID id, RescheduleInterviewRequest request) {
        Interview interview = findScheduledOrThrow(id);
        interview.setScheduledStart(request.scheduledStart());
        if (request.durationMinutes() != null) {
            interview.setDurationMinutes(request.durationMinutes());
        }
        return interviewMapper.toResponse(interview);
    }

    public InterviewResponse cancel(UUID id) {
        Interview interview = findScheduledOrThrow(id);
        interview.setStatus(InterviewStatus.CANCELLED);
        interview.setCancelledAt(Instant.now());
        return interviewMapper.toResponse(interview);
    }

    public InterviewResponse noShow(UUID id) {
        Interview interview = findScheduledOrThrow(id);
        interview.setStatus(InterviewStatus.NO_SHOW);
        return interviewMapper.toResponse(interview);
    }

    public InterviewResponse complete(UUID id) {
        Interview interview = findScheduledOrThrow(id);
        interview.setStatus(InterviewStatus.COMPLETED);
        return interviewMapper.toResponse(interview);
    }

    private Interview findScheduledOrThrow(UUID id) {
        UUID organizationId = tenantContext.getOrganizationId();
        Interview interview = interviewRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Interview not found"));
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Interview cannot be modified; current status is " + interview.getStatus());
        }
        return interview;
    }
}