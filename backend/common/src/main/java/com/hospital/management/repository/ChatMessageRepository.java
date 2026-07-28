package com.hospital.management.repository;

import com.hospital.management.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByAppointmentIdOrderByTimestampAsc(Long appointmentId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByAppointmentId(Long appointmentId);
}
