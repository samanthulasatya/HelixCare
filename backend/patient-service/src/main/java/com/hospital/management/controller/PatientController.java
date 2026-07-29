package com.hospital.management.controller;

import com.hospital.management.model.Patient;
import com.hospital.management.service.PatientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    @Autowired
    private PatientService patientService;

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getPatientProfile(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> updatePatientProfile(@PathVariable Long id, @RequestBody Patient patient) {
        return ResponseEntity.ok(patientService.updatePatientProfile(id, patient));
    }

    @GetMapping("/{id}/medical-history")
    public ResponseEntity<String> getMedicalHistory(@PathVariable Long id) {
        Patient patient = patientService.getPatientById(id);
        return ResponseEntity.ok(patient.getMedicalHistory() != null ? patient.getMedicalHistory() : "");
    }

    @PutMapping("/{id}/medical-history")
    public ResponseEntity<Patient> updateMedicalHistory(@PathVariable Long id, @RequestBody String medicalHistory) {
        return ResponseEntity.ok(patientService.updateMedicalHistory(id, medicalHistory));
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<?> getDocuments(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getDocuments(id));
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<?> addDocument(@PathVariable Long id, @RequestBody java.util.Map<String, Object> document) {
        patientService.addDocument(id, document);
        return ResponseEntity.ok("Document added successfully");
    }

    @DeleteMapping("/{id}/documents/{fileId}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id, @PathVariable Long fileId) {
        patientService.deleteDocument(id, fileId);
        return ResponseEntity.ok("Document deleted successfully");
    }
}
