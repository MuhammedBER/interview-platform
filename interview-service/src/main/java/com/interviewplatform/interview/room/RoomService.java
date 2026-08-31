package com.interviewplatform.interview.room;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewMapper;
import com.interviewplatform.interview.interview.InterviewRepository;
import com.interviewplatform.interview.interview.InterviewResponse;
import com.interviewplatform.interview.interview.InterviewSegment;
import com.interviewplatform.interview.interview.InterviewSegmentResponse;
import com.interviewplatform.interview.note.NoteResponse;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.note.NoteService;
import com.interviewplatform.interview.tenancy.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class RoomService {

  private final InterviewRepository interviewRepository;
  private final InterviewMapper interviewMapper;
  private final NoteService noteService;
  private final CandidateRepository candidateRepository;
  private final JobPositionRepository jobPositionRepository;
  private final TenantContext tenantContext;

  public RoomService(InterviewRepository interviewRepository,
                     InterviewMapper interviewMapper,
                     NoteService noteService,
                     CandidateRepository candidateRepository,
                     JobPositionRepository jobPositionRepository,
                     TenantContext tenantContext) {
    this.interviewRepository = interviewRepository;
    this.interviewMapper = interviewMapper;
    this.noteService = noteService;
    this.candidateRepository = candidateRepository;
    this.jobPositionRepository = jobPositionRepository;
    this.tenantContext = tenantContext;
  }

  @Transactional(readOnly = true)
  public RoomBootstrapResponse get(UUID interviewId) {
    UUID organizationId = tenantContext.getOrganizationId();
    Interview interview = interviewRepository.findByIdAndOrganizationId(interviewId, organizationId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Interview not found"));

    InterviewResponse summary = interviewMapper.toResponse(interview);

    List<InterviewSegmentResponse> segments = interview.getSegments().stream()
        .sorted(Comparator.comparingInt(InterviewSegment::getOrderIndex))
        .map(interviewMapper::toResponse)
        .toList();

    InterviewSegmentResponse currentSegment = currentSegment(interview);

    List<NoteResponse> notes = noteService.list(interviewId);

    return new RoomBootstrapResponse(withNames(summary, interview), segments, currentSegment, notes);
  }

  /**
   * Enrich the interview summary with the candidate and position display names
   * for the room header/context. The shared {@link InterviewResponse} carries
   * only IDs by default, so the recruiter room resolves the human-readable names
   * here rather than forcing every consumer to join candidate/position data.
   */
  private InterviewResponse withNames(InterviewResponse summary, Interview interview) {
    Candidate candidate = candidateRepository
        .findById(interview.getCandidateId()).orElse(null);
    String candidateName = (candidate == null) ? null
        : (candidate.getFirstName() + " " + candidate.getLastName()).trim();
    String candidateEmail = (candidate == null) ? null : candidate.getEmail();

    String positionName = null;
    if (interview.getJobPositionId() != null) {
      positionName = jobPositionRepository.findById(interview.getJobPositionId())
          .map(JobPosition::getName)
          .orElse(null);
    }
    String title = (positionName != null) ? positionName : "Interview";

    return new InterviewResponse(
        summary.id(),
        summary.recruiterId(),
        summary.candidateId(),
        summary.jobPositionId(),
        summary.scheduledStart(),
        summary.durationMinutes(),
        summary.status(),
        summary.admitted(),
        summary.cancelledAt(),
        summary.candidateWaitingSince(),
        summary.segments(),
        candidateName,
        candidateEmail,
        positionName,
        title);
  }

  @Transactional(readOnly = true)
  public RoomWaitingStatusResponse getWaitingStatus(UUID interviewId) {
    UUID organizationId = tenantContext.getOrganizationId();
    Interview interview = interviewRepository.findByIdAndOrganizationId(interviewId, organizationId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Interview not found"));

    Instant candidateWaitingSince = interview.getCandidateWaitingSince();
    return new RoomWaitingStatusResponse(
        interview.isAdmitted(),
        candidateWaitingSince,
        candidateWaitingSince != null);
  }

  private InterviewSegmentResponse currentSegment(Interview interview) {
    return interview.getSegments().stream()
        .filter(segment -> segment.getActualStart() != null && segment.getActualEnd() == null)
        .min(Comparator.comparingInt(InterviewSegment::getOrderIndex))
        .map(interviewMapper::toResponse)
        .orElse(null);
  }
}
