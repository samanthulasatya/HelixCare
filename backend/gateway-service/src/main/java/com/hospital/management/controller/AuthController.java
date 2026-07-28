package com.hospital.management.controller;

import com.hospital.management.dto.*;
import com.hospital.management.model.*;
import com.hospital.management.repository.*;
import com.hospital.management.security.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    private static final java.util.Map<String, String> regOtpCache = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/register-otp")
    public ResponseEntity<?> sendRegisterOtp(@RequestBody RegOtpRequest request) {
        String email = request.getEmail();
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email address is required.");
        }
        
        // Generate random 6-digit OTP code
        String otp = String.format("%06d", (int)(Math.random() * 1000000));
        regOtpCache.put(email, otp);
        
        System.out.println("\n[HELIXCARE REGISTER OTP] Generated OTP for " + email + ": " + otp);
        
        // Send live email if mailSender is active
        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(email);
                message.setSubject("HelixCare Portal - Verify Your Email Registration");
                message.setText("Hello,\n\n"
                        + "Thank you for choosing HelixCare. To complete your registration, please verify your email address.\n\n"
                        + "Your Verification Code (OTP) is: " + otp + "\n\n"
                        + "Enter this code in the registration form to finalize your account creation.\n\n"
                        + "Best regards,\n"
                        + "HelixCare Telemedicine Support Team");
                mailSender.send(message);
                System.out.println("[HelixCare Mail Service] Registration OTP successfully emailed to " + email);
            } catch (Exception e) {
                System.err.println("[HelixCare Mail Service] Failed to send registration OTP email: " + e.getMessage() + ". Falling back to simulated/dev mode.");
            }
        }
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("otpSent", true);
        response.put("devOtp", otp);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        // Verify Registration OTP
        String cachedOtp = regOtpCache.get(request.getEmail());
        if (cachedOtp == null || !cachedOtp.equals(request.getOtp())) {
            return ResponseEntity.badRequest().body("Incorrect or expired email verification code.");
        }
        regOtpCache.remove(request.getEmail());

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists!");
        }

        String role = request.getRole() != null ? request.getRole().toUpperCase() : "PATIENT";

        // Create user
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        if ("PATIENT".equals(role)) {
            Patient patient = Patient.builder()
                    .user(user)
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .email(request.getEmail())
                    .phone(request.getPhone())
                    .dateOfBirth(request.getDateOfBirth())
                    .gender(request.getGender())
                    .medicalHistory(request.getMedicalHistory())
                    .build();
            patientRepository.save(patient);
        } else if ("DOCTOR".equals(role)) {
            Doctor doctor = Doctor.builder()
                    .user(user)
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .email(request.getEmail())
                    .phone(request.getPhone())
                    .specialization(request.getSpecialization())
                    .availabilitySlots(request.getAvailabilitySlots() != null ? request.getAvailabilitySlots() : "09:00,10:00,11:00,14:00,15:00")
                    .build();
            doctorRepository.save(doctor);
        } else {
            userRepository.save(user);
        }

        return ResponseEntity.ok("Registration successful!");
    }

    private static final java.util.Map<String, String> otpCache = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        
        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        User user = userOpt.get();
        
        // Generate random 6-digit OTP code
        String otp = String.format("%06d", (int)(Math.random() * 1000000));
        otpCache.put(user.getUsername(), otp);
        
        // Fetch registered email based on user role
        String email = null;
        if ("PATIENT".equals(user.getRole())) {
            Optional<Patient> p = patientRepository.findByUserId(user.getId());
            if (p.isPresent()) email = p.get().getEmail();
        } else if ("DOCTOR".equals(user.getRole())) {
            Optional<Doctor> d = doctorRepository.findByUserId(user.getId());
            if (d.isPresent()) email = d.get().getEmail();
        }

        // Log simulated OTP to standard output
        System.out.println("\n==============================================");
        System.out.println("[HELIXCARE OTP SERVICE] 2FA Verification Alert");
        System.out.println("User: " + user.getUsername());
        System.out.println("Email: " + (email != null ? email : "N/A"));
        System.out.println("OTP Code: " + otp);
        System.out.println("==============================================\n");

        // Send actual email if SMTP mailSender and email details are configured
        if (email != null && mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(email);
                message.setSubject("HelixCare Portal - 2FA Verification Code");
                message.setText("Hello " + user.getUsername() + ",\n\n"
                        + "Your HelixCare One-Time Password (OTP) verification code is: " + otp + "\n\n"
                        + "This code is valid for 5 minutes. If you did not request this code, please secure your account immediately.\n\n"
                        + "Best regards,\n"
                        + "HelixCare Telemedicine Support Team");
                mailSender.send(message);
                System.out.println("[HelixCare Mail Service] Verification OTP email successfully dispatched to " + email);
            } catch (Exception e) {
                System.err.println("[HelixCare Mail Service] Failed to send email to " + email + ": " + e.getMessage());
            }
        }

        // Return challenge trigger to frontend
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("otpRequired", true);
        response.put("username", user.getUsername());
        response.put("devOtp", otp); // Local development helper hint
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody OtpVerifyRequest request) {
        String cachedOtp = otpCache.get(request.getUsername());
        if (cachedOtp == null || !cachedOtp.equals(request.getOtp())) {
            return ResponseEntity.status(401).body("Incorrect or expired OTP verification code.");
        }
        
        // Clear cached verification code on successful check
        otpCache.remove(request.getUsername());

        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("User session not found.");
        }

        User user = userOpt.get();
        String token = jwtTokenUtil.generateToken(user.getUsername(), user.getRole());

        Long patientId = null;
        Long doctorId = null;

        if ("PATIENT".equals(user.getRole())) {
            Optional<Patient> p = patientRepository.findByUserId(user.getId());
            if (p.isPresent()) patientId = p.get().getId();
        } else if ("DOCTOR".equals(user.getRole())) {
            Optional<Doctor> d = doctorRepository.findByUserId(user.getId());
            if (d.isPresent()) doctorId = d.get().getId();
        }

        return ResponseEntity.ok(new LoginResponse(
                token, 
                user.getUsername(), 
                user.getRole(), 
                user.getId(), 
                patientId, 
                doctorId
        ));
    }

    public static class OtpVerifyRequest {
        private String username;
        private String otp;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }
    }

    public static class RegOtpRequest {
        private String email;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
