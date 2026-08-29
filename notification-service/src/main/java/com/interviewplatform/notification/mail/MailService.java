package com.interviewplatform.notification.mail;

import com.interviewplatform.notification.kafka.InterviewEventDto;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Renders Thymeleaf templates and sends mail via JavaMailSender.
 * This class has NO @Transactional — it is intentionally called
 * after the NotificationLog row is committed, so a slow SMTP call
 * never holds a DB transaction open.
 */
@Service
public class MailService {

    private static final DateTimeFormatter DISPLAY_FMT =
            DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy 'at' HH:mm 'UTC'")
                    .withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final String from;

    public MailService(JavaMailSender mailSender,
                       TemplateEngine templateEngine,
                       @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.from = from;
    }

    public void sendInvitation(InterviewEventDto event) throws MessagingException {
        Context ctx = baseContext(event);
        send(event.getCandidateEmail(), event.getCandidateName(),
                "You have been invited to an interview: " + event.getInterviewTitle(),
                "invitation", ctx);
    }

    public void sendRescheduled(InterviewEventDto event) throws MessagingException {
        Context ctx = baseContext(event);
        send(event.getCandidateEmail(), event.getCandidateName(),
                "Your interview has been rescheduled: " + event.getInterviewTitle(),
                "rescheduled", ctx);
    }

    public void sendCancelled(InterviewEventDto event) throws MessagingException {
        Context ctx = baseContext(event);
        send(event.getCandidateEmail(), event.getCandidateName(),
                "Your interview has been cancelled: " + event.getInterviewTitle(),
                "cancelled", ctx);
    }

    public void sendLinkRegenerated(InterviewEventDto event) throws MessagingException {
        Context ctx = baseContext(event);
        send(event.getCandidateEmail(), event.getCandidateName(),
                "Your interview join link has been updated: " + event.getInterviewTitle(),
                "link-regenerated", ctx);
    }

    // -------------------------------------------------------------------------

    private Context baseContext(InterviewEventDto event) {
        Context ctx = new Context();
        ctx.setVariable("candidateName", event.getCandidateName());
        ctx.setVariable("interviewTitle", event.getInterviewTitle());
        ctx.setVariable("recruiterName", event.getRecruiterName());
        ctx.setVariable("joinUrl", event.getJoinUrl());
        ctx.setVariable("scheduledStart",
                event.getScheduledStart() != null
                        ? DISPLAY_FMT.format(event.getScheduledStart())
                        : "TBD");
        return ctx;
    }

    private void send(String toAddress,
                      String toName,
                      String subject,
                      String templateName,
                      Context ctx) throws MessagingException {
        String body = templateEngine.process("mail/" + templateName, ctx);
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(from);
        helper.setTo(toAddress);
        helper.setSubject(subject);
        helper.setText(body, true);
        mailSender.send(message);
    }
}
