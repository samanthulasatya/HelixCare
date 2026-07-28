package com.hospital.management.service;

import com.hospital.management.exception.AppointmentConflictException;
import com.hospital.management.exception.DoctorUnavailableException;
import com.hospital.management.model.*;
import com.hospital.management.repository.*;
import com.hospital.management.grpc.generated.*;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import com.hospital.management.security.NotificationClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class AppointmentService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private ConsultationNoteRepository consultationNoteRepository;


    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    public Appointment getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));
    }

    public List<Appointment> getAppointmentsByPatientId(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    public List<Appointment> getAppointmentsByDoctorId(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    @Transactional
    public Appointment bookAppointment(Long patientId, Long doctorId, LocalDate date, String timeSlot) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        // 1. Verify Doctor Availability
        String slotsStr = doctor.getAvailabilitySlots();
        if (slotsStr == null) {
            throw new DoctorUnavailableException("Doctor has no available slots scheduled.");
        }
        boolean slotAvailable = Arrays.stream(slotsStr.split(","))
                .map(String::trim)
                .anyMatch(slot -> slot.equalsIgnoreCase(timeSlot));
        if (!slotAvailable) {
            throw new DoctorUnavailableException("Doctor is not scheduled to work during slot: " + timeSlot);
        }

        // 2. Check for Appointment Conflict
        Optional<Appointment> conflict = appointmentRepository.findByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(
                doctorId, date, timeSlot, "CANCELLED");
        if (conflict.isPresent()) {
            throw new AppointmentConflictException("Doctor already has an appointment booked for date " + date + " and slot " + timeSlot);
        }

        // 3. Create Appointment
        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDate(date)
                .timeSlot(timeSlot)
                .status("SCHEDULED")
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        // Notify patient & doctor via WS
        notifyUsers(saved, "APPOINTMENT_BOOKED", "Appointment successfully scheduled on " + date + " at " + timeSlot);

        return saved;
    }

    @Transactional
    public Appointment rescheduleAppointment(Long appointmentId, LocalDate newDate, String newTimeSlot) {
        Appointment appointment = getAppointmentById(appointmentId);
        Doctor doctor = appointment.getDoctor();

        // 1. Verify Doctor Availability
        String slotsStr = doctor.getAvailabilitySlots();
        if (slotsStr == null) {
            throw new DoctorUnavailableException("Doctor has no available slots scheduled.");
        }
        boolean slotAvailable = Arrays.stream(slotsStr.split(","))
                .map(String::trim)
                .anyMatch(slot -> slot.equalsIgnoreCase(newTimeSlot));
        if (!slotAvailable) {
            throw new DoctorUnavailableException("Doctor is not scheduled to work during slot: " + newTimeSlot);
        }

        // 2. Check for Appointment Conflict
        Optional<Appointment> conflict = appointmentRepository.findByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(
                doctor.getId(), newDate, newTimeSlot, "CANCELLED");
        if (conflict.isPresent() && !conflict.get().getId().equals(appointmentId)) {
            throw new AppointmentConflictException("Doctor already has another appointment booked for date " + newDate + " and slot " + newTimeSlot);
        }

        // 3. Update slot & date
        appointment.setAppointmentDate(newDate);
        appointment.setTimeSlot(newTimeSlot);
        appointment.setStatus("RESCHEDULED");

        Appointment saved = appointmentRepository.save(appointment);

        // Notify patient & doctor via WS
        notifyUsers(saved, "APPOINTMENT_RESCHEDULED", "Appointment rescheduled to " + newDate + " at " + newTimeSlot);

        return saved;
    }

    @Transactional
    public Appointment cancelAppointment(Long appointmentId) {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus("CANCELLED");
        Appointment saved = appointmentRepository.save(appointment);

        // Notify patient & doctor via WS
        notifyUsers(saved, "APPOINTMENT_CANCELLED", "Appointment on " + appointment.getAppointmentDate() + " has been cancelled.");

        return saved;
    }

    @Transactional
    public Appointment completeAppointment(Long appointmentId) {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus("COMPLETED");
        Appointment saved = appointmentRepository.save(appointment);

        // Trigger gRPC billing call to generate invoice on port 9090
        triggerGrpcBilling(saved);

        // Notify users
        notifyUsers(saved, "APPOINTMENT_COMPLETED", "Consultation completed. Invoice generated.");

        return saved;
    }

    // Prescription sharing
    @Transactional
    public Prescription sharePrescription(Long appointmentId, String medication, String dosage, String instructions) {
        Appointment appointment = getAppointmentById(appointmentId);
        Prescription prescription = Prescription.builder()
                .appointment(appointment)
                .medication(medication)
                .dosage(dosage)
                .instructions(instructions)
                .createdAt(LocalDateTime.now())
                .build();
        
        Prescription saved = prescriptionRepository.save(prescription);
        
        // Notify patient
        NotificationClient.sendNotification("/topic/notifications/patient/" + appointment.getPatient().getId(), 
                new WebSocketNotification("PRESCRIPTION_SHARED", "New prescription shared for appointment: " + medication));
        
        return saved;
    }

    public List<Prescription> getPrescriptionsByAppointment(Long appointmentId) {
        return prescriptionRepository.findByAppointmentId(appointmentId);
    }

    public List<Prescription> getPrescriptionsByPatient(Long patientId) {
        return prescriptionRepository.findByAppointmentPatientId(patientId);
    }

    // Consultation notes
    @Transactional
    public ConsultationNote addConsultationNotes(Long appointmentId, String symptoms, String diagnosis, String treatmentPlan, String notes) {
        Appointment appointment = getAppointmentById(appointmentId);
        ConsultationNote note = ConsultationNote.builder()
                .appointment(appointment)
                .symptoms(symptoms)
                .diagnosis(diagnosis)
                .treatmentPlan(treatmentPlan)
                .notes(notes)
                .createdAt(LocalDateTime.now())
                .build();
        
        ConsultationNote saved = consultationNoteRepository.save(note);
        
        // Notify patient
        NotificationClient.sendNotification("/topic/notifications/patient/" + appointment.getPatient().getId(), 
                new WebSocketNotification("NOTES_SHARED", "Consultation notes have been updated by your doctor."));
        
        return saved;
    }

    public List<ConsultationNote> getConsultationNotesByAppointment(Long appointmentId) {
        return consultationNoteRepository.findByAppointmentId(appointmentId);
    }

    // gRPC client call helper
    private void triggerGrpcBilling(Appointment appointment) {
        try {
            // Open communication with our gRPC server running on localhost:9090
            ManagedChannel channel = ManagedChannelBuilder.forAddress("localhost", 9090)
                    .usePlaintext()
                    .build();
            
            BillingServiceGrpc.BillingServiceBlockingStub stub = BillingServiceGrpc.newBlockingStub(channel);
            
            GenerateInvoiceRequest request = GenerateInvoiceRequest.newBuilder()
                    .setAppointmentId(appointment.getId())
                    .setPatientId(appointment.getPatient().getId())
                    .setAmount(100.0 + (int)(Math.random() * 150)) // Flat fee + randomized complexity charge
                    .build();
            
            GenerateInvoiceResponse response = stub.generateInvoice(request);
            System.out.println("gRPC Response - Invoice generated with ID: " + response.getInvoiceId());
            
            channel.shutdown();
        } catch (Exception e) {
            // Log it but do not crash the app, in case gRPC server is starting up or temporarily offline
            System.err.println("Error calling Billing gRPC service: " + e.getMessage());
        }
    }

    private void notifyUsers(Appointment appointment, String type, String message) {
        WebSocketNotification wsNotif = new WebSocketNotification(type, message);
        NotificationClient.sendNotification("/topic/notifications/patient/" + appointment.getPatient().getId(), wsNotif);
        NotificationClient.sendNotification("/topic/notifications/doctor/" + appointment.getDoctor().getId(), wsNotif);
    }

    // Notification DTO
    public static class WebSocketNotification {
        public String type;
        public String message;
        public LocalDateTime timestamp;

        public WebSocketNotification(String type, String message) {
            this.type = type;
            this.message = message;
            this.timestamp = LocalDateTime.now();
        }
    }
}
