package com.hospital.management.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private String role; // ADMIN, PATIENT, DOCTOR, RECEPTIONIST
    
    // Profile Fields
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    
    // Patient Specific
    private LocalDate dateOfBirth;
    private String gender;
    private String medicalHistory;
    
    // Doctor Specific
    private String specialization;
    private String availabilitySlots; // e.g. "09:00, 10:00, 11:00, 14:00, 15:00"
    
    // Verification Code
    private String otp;
}
