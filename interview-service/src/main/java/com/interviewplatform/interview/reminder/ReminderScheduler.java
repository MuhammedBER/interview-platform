package com.interviewplatform.interview.reminder;

import com.interviewplatform.interview.candidate.Candidate;
import com.interviewplatform.interview.candidate.CandidateRepository;
import com.interviewplatform.interview.interview.Interview;
import com.interviewplatform.interview.interview.InterviewRepository;
import com.interviewplatform.interview.kafka.InterviewEvent;
import com.interviewplatform.interview.kafka.InterviewReminderDomainEvent;
import com.interviewplatform.interview.position.JobPosition;
import com.interviewplatform.interview.position.JobPositionRepository;
import com.interviewplatform.interview.recruiter.Recruiter;
import com.interviewplatform.interview.recruiter.RecruiterRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * System job that looks for SCHEDULED interviews due for a 24-hour or 1-hour
 * reminder and emits an {@code interview.reminder} event for each.
 *
 * <p>This is a system job spanning ALL organizations — it deliberately does not
 * consult {@code TenantContext} (there is no request-scoped tenant here), so no
 * organization filter is applied.</p>
 *
 * <p>Transaction boundary: the reminder timestamp stamping and the
 * {@link ApplicationEventPublisher#publishEvent(Object)} trigger happen inside ONE
 * {@code @Transactional} unit. The actual Kafka send is deferred by the existing
 * {@code @TransactionalEventListener(phase = AFTER_COMMIT)} pattern to after commit,
 * so a restart mid-window can never send the same reminder twice: once the stamp is
 * committed, the IS NULL query stops selecting the interview.</p>
 *
 * <p>Window mechanism: an interview is "due" when its {@code scheduledStart} falls
 * within [{@code now}, {@code now + window}] and the matching reminder has not been
 * sent yet. Because the job re-runs every interval and the windows are broad, no
 * sub-second precision is required — an interview is caught on the first run after
 * it enters the window. The 1-hour pass runs before the 24-hour pass and a shared
 * {@code seen} set guarantees an interview that happens to match both windows in the
 * same run is processed only once.</p>
 */
@Component
public class ReminderScheduler {

    private final InterviewRepository interviewRepository;
    private final CandidateRepository candidateRepository;
    private final RecruiterRepository recruiterRepository;
    private final JobPositionRepository jobPositionRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final int window24hMinutes;
    private final int window1hMinutes;

    public ReminderScheduler(InterviewRepository interviewRepository,
                             CandidateRepository candidateRepository,
                             RecruiterRepository recruiterRepository,
                             JobPositionRepository jobPositionRepository,
                             ApplicationEventPublisher eventPublisher,
                             @Value("${app.reminder.window-24h-minutes:1440}") int window24hMinutes,
                             @Value("${app.reminder.window-1h-minutes:60}") int window1hMinutes) {
        this.interviewRepository = interviewRepository;
        this.candidateRepository = candidateRepository;
        this.recruiterRepository = recruiterRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.eventPublisher = eventPublisher;
        this.window24hMinutes = window24hMinutes;
        this.window1hMinutes = window1hMinutes;
    }

    @Scheduled(fixedDelayString = "${app.reminder.check-interval-ms:60000}")
    @Transactional
    public void checkForReminders() {
        Instant now = Instant.now();
        Instant oneHourAhead = now.plus(Duration.ofMinutes(window1hMinutes));
        Instant oneDayAhead = now.plus(Duration.ofMinutes(window24hMinutes));

        Set<UUID> seen = new HashSet<>();

        // Narrower window first so an interview within the next hour receives the
        // 1-hour reminder, never both reminders in the same pass.
        for (Interview interview : interviewRepository.findDueFor1hReminder(now, oneHourAhead)) {
            if (!seen.add(interview.getId())) {
                continue;
            }
            if (interview.getReminder1hSentAt() != null) {
                continue;
            }
            interview.setReminder1hSentAt(now);
            Interview saved = interviewRepository.save(interview);
            eventPublisher.publishEvent(new InterviewReminderDomainEvent(buildEvent(saved, now)));
        }

        for (Interview interview : interviewRepository.findDueFor24hReminder(now, oneDayAhead)) {
            if (!seen.add(interview.getId())) {
                continue;
            }
            if (interview.getReminder24hSentAt() != null) {
                continue;
            }
            interview.setReminder24hSentAt(now);
            Interview saved = interviewRepository.save(interview);
            eventPublisher.publishEvent(new InterviewReminderDomainEvent(buildEvent(saved, now)));
        }
    }

    /**
     * Builds the same 10-field InterviewEvent shape as every other interviewer
     * event, but with {@code joinUrl = null}: the underlying raw join token is not
     * recoverable from the DB (only its SHA-256 hash is stored) and regenerating it
     * would invalidate the candidate's existing link as an unwanted side effect of a
     * reminder. The reminder email therefore carries no join link and should point
     * the candidate back to their original invitation. See the internship report
     * notes for the product gap and a future fix (storing an encrypted raw token, or
     * making the invitation email the single source of the join link).
     */
    private InterviewEvent buildEvent(Interview interview, Instant now) {
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
                null,
                interview.getScheduledStart(),
                now
        );
    }
}
