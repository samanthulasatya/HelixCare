package com.hospital.management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationDispatchController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/dispatch")
    public ResponseEntity<?> dispatchNotification(@RequestBody NotificationPayload payload) {
        messagingTemplate.convertAndSend(payload.getDestination(), payload.getPayload());
        return ResponseEntity.ok().build();
    }

    public static class NotificationPayload {
        private String destination;
        private Object payload;

        public String getDestination() { return destination; }
        public void setDestination(String destination) { this.destination = destination; }

        public Object getPayload() { return payload; }
        public void setPayload(Object payload) { this.payload = payload; }
    }
}
