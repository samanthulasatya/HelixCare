package com.hospital.management.repository;

import com.hospital.management.model.ConsultationNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConsultationNoteRepository extends JpaRepository<ConsultationNote, Long> {
    List<ConsultationNote> findByAppointmentId(Long appointmentId);
    List<ConsultationNote> findByAppointmentPatientId(Long patientId);
}
