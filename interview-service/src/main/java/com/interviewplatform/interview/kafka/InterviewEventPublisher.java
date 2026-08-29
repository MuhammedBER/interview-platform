package com.interviewplatform.interview.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class InterviewEventPublisher {

  private final KafkaTemplate<String, String> kafkaTemplate;
  private final ObjectMapper objectMapper;

  public InterviewEventPublisher(
      KafkaTemplate<String, String> kafkaTemplate,
      ObjectMapper objectMapper) {
    this.kafkaTemplate = kafkaTemplate;
    this.objectMapper = objectMapper;
  }

  public void publish(String topic, InterviewEvent event) {
    try {
      String json = objectMapper.writeValueAsString(event);
      kafkaTemplate.send(topic, event.interviewId().toString(), json);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Failed to serialize InterviewEvent to JSON", e);
    }
  }
}
