package com.interviewplatform.interview.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InterviewEventPublisherTest {

  @Mock
  private KafkaTemplate<String, String> kafkaTemplate;

  private ObjectMapper objectMapper;
  private InterviewEventPublisher publisher;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.registerModule(new JavaTimeModule());
    objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    publisher = new InterviewEventPublisher(kafkaTemplate, objectMapper);
  }

  @Test
  void publish_serializesEventToCanonicalJsonAndSendsToKafka() throws Exception {
    // Arrange
    UUID eventId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    UUID interviewId = UUID.fromString("22222222-2222-2222-2222-222222222222");
    Instant occurredAt = Instant.parse("2026-08-29T00:00:00Z");
    Instant scheduledStart = Instant.parse("2026-08-30T10:00:00Z");

    InterviewEvent event = new InterviewEvent(
        eventId,
        interviewId,
        "Senior Java Developer Interview",
        "Jane Candidate",
        "jane@example.com",
        "John Recruiter",
        "john@example.com",
        "http://localhost:3000/join/sample-token",
        scheduledStart,
        occurredAt
    );

    // Act
    publisher.publish("interview.scheduled", event);

    // Assert
    ArgumentCaptor<String> topicCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> jsonCaptor = ArgumentCaptor.forClass(String.class);

    verify(kafkaTemplate).send(topicCaptor.capture(), keyCaptor.capture(), jsonCaptor.capture());

    assertThat(topicCaptor.getValue()).isEqualTo("interview.scheduled");
    assertThat(keyCaptor.getValue()).isEqualTo(interviewId.toString());

    String jsonOutput = jsonCaptor.getValue();
    JsonNode jsonNode = objectMapper.readTree(jsonOutput);

    // Verify exactly 10 keys
    List<String> fieldNames = new ArrayList<>();
    jsonNode.fieldNames().forEachRemaining(fieldNames::add);
    assertThat(fieldNames).containsExactlyInAnyOrder(
        "eventId",
        "interviewId",
        "interviewTitle",
        "candidateName",
        "candidateEmail",
        "recruiterName",
        "recruiterEmail",
        "joinUrl",
        "scheduledStart",
        "occurredAt"
    );

    assertThat(jsonNode.get("eventId").asText()).isEqualTo("11111111-1111-1111-1111-111111111111");
    assertThat(jsonNode.get("interviewId").asText()).isEqualTo("22222222-2222-2222-2222-222222222222");
    assertThat(jsonNode.get("interviewTitle").asText()).isEqualTo("Senior Java Developer Interview");
    assertThat(jsonNode.get("candidateName").asText()).isEqualTo("Jane Candidate");
    assertThat(jsonNode.get("candidateEmail").asText()).isEqualTo("jane@example.com");
    assertThat(jsonNode.get("recruiterName").asText()).isEqualTo("John Recruiter");
    assertThat(jsonNode.get("recruiterEmail").asText()).isEqualTo("john@example.com");
    assertThat(jsonNode.get("joinUrl").asText()).isEqualTo("http://localhost:3000/join/sample-token");

    // Assert scheduledStart and occurredAt are ISO-8601 strings
    assertThat(jsonNode.get("scheduledStart").isTextual()).isTrue();
    assertThat(jsonNode.get("scheduledStart").asText()).isEqualTo("2026-08-30T10:00:00Z");
    assertThat(jsonNode.get("occurredAt").isTextual()).isTrue();
    assertThat(jsonNode.get("occurredAt").asText()).isEqualTo("2026-08-29T00:00:00Z");
  }
}
