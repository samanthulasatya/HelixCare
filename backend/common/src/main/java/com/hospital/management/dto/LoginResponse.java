package com.hospital.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private String role;
    private Long userId;
    private Long patientId; // null if not patient
    private Long doctorId;  // null if not doctor
}
