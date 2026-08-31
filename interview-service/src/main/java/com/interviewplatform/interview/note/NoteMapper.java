package com.interviewplatform.interview.note;

import org.springframework.stereotype.Component;

@Component
public class NoteMapper {

  public NoteResponse toResponse(Note note) {
    return new NoteResponse(
        note.getId(),
        note.getInterviewId(),
        note.getSegmentId(),
        note.getContent(),
        note.getElapsedSeconds(),
        note.getCreatedAt(),
        note.getUpdatedAt());
  }
}
