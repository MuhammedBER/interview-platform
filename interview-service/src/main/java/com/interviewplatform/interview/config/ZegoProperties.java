package com.interviewplatform.interview.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Holds the ZEGO credentials needed to mint video tokens.
 *
 * <p>{@code appId} is non-secret and may reach the browser. {@code serverSecret}
 * is secret: it is injected but never logged, never included in any response,
 * and never referenced from any frontend file.
 */
@Component
public class ZegoProperties {

    private final long appId;
    private final String serverSecret;

    public ZegoProperties(@Value("${app.zego.app-id:}") String appId,
                          @Value("${app.zego.server-secret:}") String serverSecret) {
        this.serverSecret = serverSecret;
        this.appId = parseAppId(appId);
    }

    @PostConstruct
    void validate() {
        if (this.appId <= 0L) {
            throw new IllegalStateException(
                    "Missing or invalid configuration: ZEGO_APP_ID must be a positive number. "
                            + "Set ZEGO_APP_ID in the environment before starting interview-service.");
        }
        if (this.serverSecret == null || this.serverSecret.isBlank()) {
            throw new IllegalStateException(
                    "Missing required configuration: ZEGO_SERVER_SECRET is not set or is blank. "
                            + "Set ZEGO_SERVER_SECRET in the environment before starting interview-service.");
        }
    }

    private long parseAppId(String appId) {
        if (appId == null || appId.isBlank()) {
            return 0L;
        }
        long parsed;
        try {
            parsed = Long.parseLong(appId.trim());
        } catch (NumberFormatException e) {
            return -1L;
        }
        return parsed;
    }

    public long appId() {
        return appId;
    }

    public String serverSecret() {
        return serverSecret;
    }
}
