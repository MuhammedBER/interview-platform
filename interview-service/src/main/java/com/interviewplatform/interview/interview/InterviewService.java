package com.interviewplatform.interview.interview;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.position.TemplateSegment;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import com.interviewplatform.interview.tenancy.TenantContext;
import com.interviewplatform.interview.jointoken.JoinTokenService;
import com.interviewplatform.interview.kafka.InterviewCancelledDomainEvent;
import com.interviewplatform.interview.kafka.InterviewEvent;
import com.interviewplatform.interview.kafka.InterviewLinkRegeneratedDomainEvent;
import com.interviewplatform.interview.kafka.InterviewRescheduledDomainEvent;
import com.interviewplatform.interview.kafka.InterviewScheduledDomainEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
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
    private final JoinTokenService joinTokenService;
    private final ApplicationEventPublisher eventPublisher;
    private final String joinBaseUrl;

    public InterviewService(InterviewRepository interviewRepository,
                            CandidateRepository candidateRepository,
                            RecruiterRepository recruiterRepository,
                            JobPositionRepository jobPositionRepository,
                            InterviewMapper interviewMapper,
                            TenantContext tenantContext,
                            JoinTokenService joinTokenService,
                            ApplicationEventPublisher eventPublisher,
                            @Value("${app.join.base-url:http://localhost:3000/join}") String joinBaseUrl) {
        this.interviewRepository = interviewRepository;
        this.candidateRepository = candidateRepository;
        this.recruiterRepository = recruiterRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.interviewMapper = interviewMapper;
        this.tenantContext = tenantContext;
        this.joinTokenService = joinTokenService;
        this.eventPublisher = eventPublisher;
        this.joinBaseUrl = joinBaseUrl;
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

        JobPosition position = null;
        if (request.jobPositionId() != null) {
            position = jobPositionRepository
                    .findByIdAndOrganizationId(request.jobPositionId(), organizationId)
                    .orElse(null);
        }

        if (request.segments() != null && !request.segments().isEmpty()) {
            for (ScheduleInterviewRequest.ScheduleSegmentInput seg : request.segments()) {
                interview.addSegment(interviewMapper.toNewSegment(seg));
            }
        } else if (position != null) {
            for (TemplateSegment template : position.getTemplates()) {
                interview.addSegment(interviewMapper.copyFromTemplate(template));
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "An interview with no position must include at least one segment");
        }

        Interview saved = interviewRepository.save(interview);

        String rawToken = joinTokenService.generateJoinToken(saved);
        String joinUrl = joinBaseUrl + "/" + rawToken;

        String interviewTitle = (position != null) ? position.getName() : "Interview";
        String candidateName = (candidate.getFirstName() + " " + candidate.getLastName()).trim();
        String recruiterName = (recruiter.getFirstName() + " " + recruiter.getLastName()).trim();

        InterviewEvent event = new InterviewEvent(
                UUID.randomUUID(),
                saved.getId(),
                interviewTitle,
                candidateName,
                candidate.getEmail(),
                recruiterName,
                recruiter.getEmail(),
                joinUrl,
                saved.getScheduledStart(),
                Instant.now()
        );

        eventPublisher.publishEvent(new InterviewScheduledDomainEvent(event));

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
        Interview saved = interviewRepository.save(interview);

        String rawToken = joinTokenService.regenerateJoinToken(saved);
        String joinUrl = joinBaseUrl + "/" + rawToken;

        InterviewEvent event = buildInterviewEvent(saved, joinUrl);
        eventPublisher.publishEvent(new InterviewRescheduledDomainEvent(event));

        return interviewMapper.toResponse(saved);
    }

    public InterviewResponse cancel(UUID id) {
        Interview interview = findScheduledOrThrow(id);
        interview.setStatus(InterviewStatus.CANCELLED);
        interview.setCancelledAt(Instant.now());
        Interview saved = interviewRepository.save(interview);

        joinTokenService.revokeActiveTokens(saved);

        InterviewEvent event = buildInterviewEvent(saved, null);
        eventPublisher.publishEvent(new InterviewCancelledDomainEvent(event));

        return interviewMapper.toResponse(saved);
    }

    public String regenerateLink(UUID id) {
        Interview interview = findScheduledOrThrow(id);

        String rawToken = joinTokenService.regenerateJoinToken(interview);
        String joinUrl = joinBaseUrl + "/" + rawToken;

        InterviewEvent event = buildInterviewEvent(interview, joinUrl);
        eventPublisher.publishEvent(new InterviewLinkRegeneratedDomainEvent(event));

        return joinUrl;
    }

    public void revokeLink(UUID id) {
        Interview interview = findScheduledOrThrow(id);
        joinTokenService.revokeActiveTokens(interview);
    }

    public InterviewResponse admit(UUID id) {
        Interview interview = findScheduledOrThrow(id);
        interview.setAdmitted(true);
        Interview saved = interviewRepository.save(interview);
        return interviewMapper.toResponse(saved);
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

    private InterviewEvent buildInterviewEvent(Interview interview, String joinUrl) {
        Candidate candidate = candidateRepository.findById(interview.getCandidateId()).orElse(null);
        String candidateName = (candidate != null)
                ? (candidate.getFirstName() + " " + candidate.getLastName()).trim() : "";
        String candidateEmail = (candidate != null) ? candidate.getEmail() : "";

        Recruiter recruiter = recruiterRepository.findById(interview.getRecruiterId()).orElse(null);
        String recruiterName = (recruiter != null)
                ? (recruiter.getFirstName() + " " + recruiter.getLastName()).trim() : "";
        String recruiterEmail = (recruiter != null) ? recruiter.getEmail() : "";

        String interviewTitle = "Interview";
        if (interview.getJobPositionId() != null) {
            interviewTitle = jobPositionRepository.findById(interview.getJobPositionId())
                    .map(JobPosition::getName)
                    .orElse("Interview");
        }

        return new InterviewEvent(
                UUID.randomUUID(),
                interview.getId(),
                interviewTitle,
                candidateName,
                candidateEmail,
                recruiterName,
                recruiterEmail,
                joinUrl,
                interview.getScheduledStart(),
                Instant.now()
        );
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