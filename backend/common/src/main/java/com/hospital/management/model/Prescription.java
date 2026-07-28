package com.hospital.management.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Column(nullable = false)
    private String medication;

    @Column(nullable = false)
    private String dosage; // e.g. "500mg, twice a day"

    @Column(columnDefinition = "TEXT")
    private String instructions; // e.g. "Take after meals"

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
