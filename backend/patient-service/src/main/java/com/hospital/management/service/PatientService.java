package com.hospital.management.service;

import com.hospital.management.model.Patient;
import com.hospital.management.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PatientService {

    @Autowired
    private PatientRepository patientRepository;

    public Patient getPatientById(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + id));
    }

    public Patient getPatientByUsername(String username) {
        return patientRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Patient not found with username: " + username));
    }

    public Patient getPatientByUserId(Long userId) {
        return patientRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Patient not found for user id: " + userId));
    }

    @Transactional
    public Patient updatePatientProfile(Long id, Patient updatedProfile) {
        Patient existing = getPatientById(id);
        existing.setFirstName(updatedProfile.getFirstName());
        existing.setLastName(updatedProfile.getLastName());
        existing.setEmail(updatedProfile.getEmail());
        existing.setPhone(updatedProfile.getPhone());
        existing.setDateOfBirth(updatedProfile.getDateOfBirth());
        existing.setGender(updatedProfile.getGender());
        return patientRepository.save(existing);
    }

    @Transactional
    public Patient updateMedicalHistory(Long id, String medicalHistory) {
        Patient existing = getPatientById(id);
        existing.setMedicalHistory(medicalHistory);
        return patientRepository.save(existing);
    }
}
