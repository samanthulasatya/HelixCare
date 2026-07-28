package com.hospital.management.security;

import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

public class NotificationClient {
    private static final RestTemplate restTemplate = new RestTemplate();
    private static final String GATEWAY_URL = "http://localhost:8080/api/notifications/dispatch";

    public static void sendNotification(String destination, Object payload) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("destination", destination);
            body.put("payload", payload);
            restTemplate.postForEntity(GATEWAY_URL, body, Void.class);
        } catch (Exception e) {
            System.err.println("Error dispatching notification via gateway: " + e.getMessage());
        }
    }
}
