package com.interviewplatform.interview;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Full application context smoke test.
 * Requires a live PostgreSQL database and Keycloak instance to boot.
 * Run manually with the docker-compose stack: docker-compose up -d
 * All domain logic is covered by the dedicated unit test suites.
 */
@Disabled("Requires live PostgreSQL + Keycloak — run with docker-compose stack only")
@SpringBootTest
class InterviewServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}

