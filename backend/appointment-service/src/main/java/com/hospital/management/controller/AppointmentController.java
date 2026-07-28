package com.hospital.management.controller;

import com.hospital.management.model.Appointment;
import com.hospital.management.model.ConsultationNote;
import com.hospital.management.model.Prescription;
import com.hospital.management.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

import com.hospital.management.model.ChatMessage;
import com.hospital.management.repository.ChatMessageRepository;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatientId(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByDoctorId(doctorId));
    }

    @PostMapping
    public ResponseEntity<Appointment> bookAppointment(@RequestBody BookRequest request) {
        LocalDate date = LocalDate.parse(request.getDate());
        return ResponseEntity.ok(appointmentService.bookAppointment(
                request.getPatientId(),
                request.getDoctorId(),
                date,
                request.getTimeSlot()
        ));
    }

    @PutMapping("/{id}/reschedule")
    public ResponseEntity<Appointment> rescheduleAppointment(@PathVariable Long id, @RequestBody RescheduleRequest request) {
        LocalDate date = LocalDate.parse(request.getDate());
        return ResponseEntity.ok(appointmentService.rescheduleAppointment(id, date, request.getTimeSlot()));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Appointment> cancelAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.cancelAppointment(id));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Appointment> completeAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.completeAppointment(id));
    }

    // Prescriptions
    @PostMapping("/{id}/prescription")
    public ResponseEntity<Prescription> sharePrescription(@PathVariable Long id, @RequestBody PrescriptionRequest request) {
        return ResponseEntity.ok(appointmentService.sharePrescription(
                id, 
                request.getMedication(), 
                request.getDosage(), 
                request.getInstructions()
        ));
    }

    @GetMapping("/{id}/prescription")
    public ResponseEntity<List<Prescription>> getPrescriptionsByAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.getPrescriptionsByAppointment(id));
    }

    @GetMapping("/patient/{patientId}/prescriptions")
    public ResponseEntity<List<Prescription>> getPrescriptionsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(appointmentService.getPrescriptionsByPatient(patientId));
    }

    // Consultation notes
    @PostMapping("/{id}/notes")
    public ResponseEntity<ConsultationNote> addNotes(@PathVariable Long id, @RequestBody NotesRequest request) {
        return ResponseEntity.ok(appointmentService.addConsultationNotes(
                id, 
                request.getSymptoms(), 
                request.getDiagnosis(), 
                request.getTreatmentPlan(), 
                request.getNotes()
        ));
    }

    @GetMapping("/{id}/notes")
    public ResponseEntity<List<ConsultationNote>> getNotesByAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.getConsultationNotesByAppointment(id));
    }

    @GetMapping("/{id}/chat")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable Long id) {
        return ResponseEntity.ok(chatMessageRepository.findByAppointmentIdOrderByTimestampAsc(id));
    }

    @DeleteMapping("/{id}/chat")
    public ResponseEntity<String> deleteChatHistory(@PathVariable Long id) {
        chatMessageRepository.deleteByAppointmentId(id);
        return ResponseEntity.ok("Chat history deleted successfully.");
    }

    // Request structures
    public static class BookRequest {
        private Long patientId;
        private Long doctorId;
        private String date; // YYYY-MM-DD
        private String timeSlot;

        public Long getPatientId() { return patientId; }
        public void setPatientId(Long patientId) { this.patientId = patientId; }
        public Long getDoctorId() { return doctorId; }
        public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getTimeSlot() { return timeSlot; }
        public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }
    }

    public static class RescheduleRequest {
        private String date; // YYYY-MM-DD
        private String timeSlot;

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getTimeSlot() { return timeSlot; }
        public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }
    }

    public static class PrescriptionRequest {
        private String medication;
        private String dosage;
        private String instructions;

        public String getMedication() { return medication; }
        public void setMedication(String medication) { this.medication = medication; }
        public String getDosage() { return dosage; }
        public void setDosage(String dosage) { this.dosage = dosage; }
        public String getInstructions() { return instructions; }
        public void setInstructions(String instructions) { this.instructions = instructions; }
    }

    public static class NotesRequest {
        private String symptoms;
        private String diagnosis;
        private String treatmentPlan;
        private String notes;

        public String getSymptoms() { return symptoms; }
        public void setSymptoms(String symptoms) { this.symptoms = symptoms; }
        public String getDiagnosis() { return diagnosis; }
        public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }
        public String getTreatmentPlan() { return treatmentPlan; }
        public void setTreatmentPlan(String treatmentPlan) { this.treatmentPlan = treatmentPlan; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
}
