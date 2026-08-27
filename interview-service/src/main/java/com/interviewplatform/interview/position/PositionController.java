package com.interviewplatform.interview.position;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @PostMapping
    public ResponseEntity<PositionResponse> create(@Valid @RequestBody PositionRequest request) {
        PositionResponse created = positionService.create(request);
        URI location = URI.create("/api/positions/" + created.id());
        return ResponseEntity.created(location).body(created);   // 201 + Location
    }

    @GetMapping
    public List<PositionResponse> list() {
        return positionService.list();
    }

    @GetMapping("/{id}")
    public PositionResponse get(@PathVariable UUID id) {
        return positionService.get(id);
    }

    @PutMapping("/{id}")
    public PositionResponse update(@PathVariable UUID id,
                                   @Valid @RequestBody PositionRequest request) {
        return positionService.update(id, request);
    }
}