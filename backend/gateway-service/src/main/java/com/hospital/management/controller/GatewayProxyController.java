package com.hospital.management.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.net.URI;

@RestController
public class GatewayProxyController {

    private final RestTemplate restTemplate = new RestTemplate();

    // Downstream service base URLs inside the Docker network
    private static final String PATIENT_SERVICE_URL = "http://patient-service:8085";
    private static final String DOCTOR_SERVICE_URL = "http://doctor-service:8086";
    private static final String APPOINTMENT_SERVICE_URL = "http://appointment-service:8087";
    private static final String BILLING_SERVICE_URL = "http://billing-service:8088";

    @RequestMapping(value = {
        "/api/patients/**",
        "/api/doctors/**",
        "/api/appointments/**",
        "/api/billing/**",
        "/ws/**",
        "/ws"
    }, method = {
        RequestMethod.GET, 
        RequestMethod.POST, 
        RequestMethod.PUT, 
        RequestMethod.DELETE, 
        RequestMethod.OPTIONS, 
        RequestMethod.PATCH
    })
    public ResponseEntity<?> proxyRequest(
        @RequestBody(required = false) String body, 
        HttpServletRequest request, 
        @RequestHeader HttpHeaders headers
    ) {
        String path = request.getRequestURI();
        String query = request.getQueryString();
        String targetBaseUrl;

        if (path.startsWith("/api/patients")) {
            targetBaseUrl = PATIENT_SERVICE_URL;
        } else if (path.startsWith("/api/doctors")) {
            targetBaseUrl = DOCTOR_SERVICE_URL;
        } else if (path.startsWith("/api/appointments")) {
            targetBaseUrl = APPOINTMENT_SERVICE_URL;
        } else if (path.startsWith("/api/billing") || path.startsWith("/ws")) {
            targetBaseUrl = BILLING_SERVICE_URL;
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Path not routed");
        }

        String targetUrl = targetBaseUrl + path + (query != null ? "?" + query : "");

        try {
            // Copy incoming headers
            HttpHeaders forwardHeaders = new HttpHeaders();
            headers.forEach((name, values) -> {
                if (!name.equalsIgnoreCase("host") && !name.equalsIgnoreCase("content-length")) {
                    forwardHeaders.put(name, values);
                }
            });

            HttpEntity<String> httpEntity = new HttpEntity<>(body, forwardHeaders);
            HttpMethod method = HttpMethod.valueOf(request.getMethod());

            ResponseEntity<byte[]> responseEntity = restTemplate.exchange(new URI(targetUrl), method, httpEntity, byte[].class);

            // Filter response headers from downstream microservices to avoid duplicate chunking/length conflicts in Nginx
            HttpHeaders responseHeaders = new HttpHeaders();
            if (responseEntity.getHeaders() != null) {
                responseEntity.getHeaders().forEach((name, values) -> {
                    if (!name.equalsIgnoreCase("transfer-encoding") && 
                        !name.equalsIgnoreCase("connection") && 
                        !name.equalsIgnoreCase("content-length") &&
                        !name.equalsIgnoreCase("keep-alive")) {
                        responseHeaders.put(name, values);
                    }
                });
            }

            return new ResponseEntity<>(responseEntity.getBody(), responseHeaders, responseEntity.getStatusCode());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Error routing request: " + e.getMessage());
        }
    }
}
