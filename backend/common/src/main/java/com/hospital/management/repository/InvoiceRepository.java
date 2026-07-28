package com.hospital.management.repository;

import com.hospital.management.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByPatientId(Long patientId);
    Optional<Invoice> findByAppointmentId(Long appointmentId);
    List<Invoice> findByStatus(String status);
}
