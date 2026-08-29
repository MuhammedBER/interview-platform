package com.interviewplatform.interview.publicjoin;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/join-tokens")
public class PublicJoinController {

  private final PublicJoinService publicJoinService;

  public PublicJoinController(PublicJoinService publicJoinService) {
    this.publicJoinService = publicJoinService;
  }

  @GetMapping("/{rawToken}")
  public ResponseEntity<?> validateToken(@PathVariable String rawToken) {
    return publicJoinService.validateToken(rawToken);
  }
}
