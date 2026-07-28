package com.hospital.management.service;

import com.hospital.management.exception.PaymentFailedException;
import com.hospital.management.model.Invoice;
import com.hospital.management.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BillingService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    public Invoice getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found with id: " + id));
    }

    public Invoice getInvoiceByAppointmentId(Long appointmentId) {
        return invoiceRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Invoice not found for appointment: " + appointmentId));
    }

    public List<Invoice> getInvoicesByPatientId(Long patientId) {
        return invoiceRepository.findByPatientId(patientId);
    }

    @Transactional
    public Invoice createInvoice(Long appointmentId, Long patientId, Double amount) {
        Invoice invoice = Invoice.builder()
                .appointmentId(appointmentId)
                .patientId(patientId)
                .amount(amount)
                .status("PENDING")
                .generatedAt(LocalDateTime.now())
                .build();
        return invoiceRepository.save(invoice);
    }

    @Transactional
    public Invoice processPayment(Long invoiceId, String cardNumber, String cvv) {
        Invoice invoice = getInvoiceById(invoiceId);

        if (invoice.getStatus().equals("PAID")) {
            throw new RuntimeException("Invoice is already paid.");
        }

        // Simulate credit card processing failure
        if (cardNumber != null && (cardNumber.endsWith("0000") || cardNumber.contains("fail"))) {
            invoice.setStatus("FAILED");
            invoiceRepository.save(invoice);
            throw new PaymentFailedException("Payment processing failed: Transaction declined by issuing bank.");
        }

        invoice.setStatus("PAID");
        return invoiceRepository.save(invoice);
    }

    // SOAP Business Logic Helper
    public boolean verifyInsurance(String policyNumber, String provider, double claimAmount, double[] coverageAmountOut) {
        if (policyNumber == null || policyNumber.trim().isEmpty() || policyNumber.toUpperCase().contains("EXPIRED")) {
            coverageAmountOut[0] = 0.0;
            return false;
        }

        String policy = policyNumber.toUpperCase();
        
        // Tier 1: Gold Policy (POL-GOLD-***)
        if (policy.contains("GOLD")) {
            // Covers 100% of the claim minus a $10 flat copay
            double coverage = claimAmount - 10.0;
            coverageAmountOut[0] = Math.max(0.0, coverage);
            return true;
        }
        
        // Tier 2: Silver Policy (POL-SILVER-***)
        if (policy.contains("SILVER")) {
            // Covers 80% after a $50 deductible
            double subjectToCoverage = claimAmount - 50.0;
            if (subjectToCoverage <= 0) {
                coverageAmountOut[0] = 0.0;
            } else {
                coverageAmountOut[0] = subjectToCoverage * 0.80;
            }
            return true;
        }
        
        // Tier 3: Bronze Policy (POL-BRONZE-***)
        if (policy.contains("BRONZE")) {
            // Covers 50% flat, max limit $500
            double coverage = claimAmount * 0.50;
            coverageAmountOut[0] = Math.min(500.0, coverage);
            return true;
        }

        // Tier 4: Default Fallback Policy (unspecified code)
        // Covers a flat 60% up to $300 max
        double coverage = claimAmount * 0.60;
        coverageAmountOut[0] = Math.min(300.0, coverage);
        return true;
    }
}
