package com.interviewplatform.interview.note;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/interviews/{interviewId}/notes")
public class NoteController {

  private final NoteService noteService;

  public NoteController(NoteService noteService) {
    this.noteService = noteService;
  }

  @PostMapping
  public ResponseEntity<NoteResponse> create(@PathVariable UUID interviewId,
                                             @Valid @RequestBody NoteRequest request) {
    NoteResponse created = noteService.create(interviewId, request);
    URI location = URI.create("/api/interviews/" + interviewId + "/notes/" + created.id());
    return ResponseEntity.created(location).body(created);
  }

  @GetMapping
  public List<NoteResponse> list(@PathVariable UUID interviewId) {
    return noteService.list(interviewId);
  }
}
