package com.interviewplatform.notification;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Full application context smoke test.
 * Requires a live PostgreSQL, Kafka, and MailHog instance to boot.
 * Run manually with the docker-compose stack: docker-compose up -d
 * All domain logic is covered by the dedicated unit test suite.
 */
@Disabled("Requires live PostgreSQL + Kafka + MailHog — run with docker-compose stack only")
@SpringBootTest
class NotificationServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}
