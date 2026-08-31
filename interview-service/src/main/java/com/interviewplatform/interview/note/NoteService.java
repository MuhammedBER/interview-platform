package com.interviewplatform.interview.note;

import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewRepository;
import com.interviewplatform.interview.interview.InterviewSegment;
import com.interviewplatform.interview.tenancy.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class NoteService {

  private final NoteRepository noteRepository;
  private final InterviewRepository interviewRepository;
  private final TenantContext tenantContext;
  private final NoteMapper noteMapper;

  public NoteService(
      NoteRepository noteRepository,
      InterviewRepository interviewRepository,
      TenantContext tenantContext,
      NoteMapper noteMapper) {
    this.noteRepository = noteRepository;
    this.interviewRepository = interviewRepository;
    this.tenantContext = tenantContext;
    this.noteMapper = noteMapper;
  }

  @Transactional
  public NoteResponse create(UUID interviewId, NoteRequest request) {
    UUID organizationId = tenantContext.getOrganizationId();
    Interview interview = resolveInterview(interviewId, organizationId);

    int elapsedSeconds = elapsedSeconds(interview, request.segmentId());
    Instant now = Instant.now();
    Note note = new Note(
        interviewId,
        request.segmentId(),
        request.content(),
        elapsedSeconds,
        now,
        now);

    return noteMapper.toResponse(noteRepository.save(note));
  }

  @Transactional(readOnly = true)
  public List<NoteResponse> list(UUID interviewId) {
    UUID organizationId = tenantContext.getOrganizationId();
    resolveInterview(interviewId, organizationId);

    return noteRepository.findByInterviewIdOrderByCreatedAtAsc(interviewId).stream()
        .map(noteMapper::toResponse)
        .toList();
  }

  private Interview resolveInterview(UUID interviewId, UUID organizationId) {
    return interviewRepository.findByIdAndOrganizationId(interviewId, organizationId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Interview not found"));
  }

  private int elapsedSeconds(Interview interview, UUID segmentId) {
    Instant startRef;

    if (segmentId != null) {
      InterviewSegment segment = findSegmentOrThrow(interview, segmentId);
      startRef = segment.getActualStart() != null
          ? segment.getActualStart()
          : earliestActualStart(interview);
    } else {
      startRef = earliestActualStart(interview);
    }

    if (startRef == null) {
      return 0;
    }
    long seconds = Duration.between(startRef, Instant.now()).getSeconds();
    return (int) Math.max(seconds, 0);
  }

  private InterviewSegment findSegmentOrThrow(Interview interview, UUID segmentId) {
    return interview.getSegments().stream()
        .filter(segment -> segment.getId().equals(segmentId))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Segment not found in this interview"));
  }

  private Instant earliestActualStart(Interview interview) {
    return interview.getSegments().stream()
        .map(InterviewSegment::getActualStart)
        .filter(Objects::nonNull)
        .min(Comparator.naturalOrder())
        .orElse(null);
  }
}
