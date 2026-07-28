package com.hospital.management.controller;

import com.hospital.management.model.ChatMessage;
import com.hospital.management.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;

@Controller
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @MessageMapping("/chat/{appointmentId}")
    @SendTo("/topic/chat/{appointmentId}")
    public ChatMessage handleMessage(@DestinationVariable Long appointmentId, ChatMessage message) {
        // 1. Enrich message details
        message.setAppointmentId(appointmentId);
        message.setTimestamp(LocalDateTime.now());

        // 2. Persist message to MySQL
        ChatMessage saved = chatMessageRepository.save(message);

        // 3. Broadcast the saved record (which contains the DB-assigned ID and timestamp)
        return saved;
    }
}
