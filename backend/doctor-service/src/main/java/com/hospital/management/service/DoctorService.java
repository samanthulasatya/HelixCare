package com.hospital.management.service;

import com.hospital.management.model.Doctor;
import com.hospital.management.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class DoctorService {

    @Autowired
    private DoctorRepository doctorRepository;

    public Doctor getDoctorById(Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + id));
    }

    public Doctor getDoctorByUserId(Long userId) {
        return doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Doctor not found for user id: " + userId));
    }

    public Doctor getDoctorByUsername(String username) {
        return doctorRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Doctor not found with username: " + username));
    }

    public List<Doctor> searchDoctors(String query) {
        if (query == null || query.trim().isEmpty()) {
            return doctorRepository.findAll();
        }
        return doctorRepository.searchDoctors(query);
    }

    @Transactional
    public Doctor updateAvailability(Long id, String slots) {
        Doctor existing = getDoctorById(id);
        existing.setAvailabilitySlots(slots);
        return doctorRepository.save(existing);
    }
}
