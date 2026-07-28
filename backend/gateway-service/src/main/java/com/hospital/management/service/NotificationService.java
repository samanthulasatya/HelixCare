package com.hospital.management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class NotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void sendAppointmentReminder(Long patientId, String message) {
        NotificationPayload payload = new NotificationPayload("REMINDER", message);
        messagingTemplate.convertAndSend("/topic/notifications/patient/" + patientId, payload);
    }

    public void sendPrescriptionAlert(Long patientId, String message) {
        NotificationPayload payload = new NotificationPayload("PRESCRIPTION_ALERT", message);
        messagingTemplate.convertAndSend("/topic/notifications/patient/" + patientId, payload);
    }

    public static class NotificationPayload {
        public String type;
        public String message;
        public LocalDateTime timestamp;

        public NotificationPayload(String type, String message) {
            this.type = type;
            this.message = message;
            this.timestamp = LocalDateTime.now();
        }
    }
}
