package com.hospital.management.grpc;

import com.hospital.management.model.Invoice;
import com.hospital.management.service.BillingService;
import com.hospital.management.grpc.generated.*;
import io.grpc.stub.StreamObserver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.format.DateTimeFormatter;

@Service
public class GrpcBillingService extends BillingServiceGrpc.BillingServiceImplBase {

    @Autowired
    private BillingService billingService;

    @Override
    public void generateInvoice(GenerateInvoiceRequest request, StreamObserver<GenerateInvoiceResponse> responseObserver) {
        try {
            long appointmentId = request.getAppointmentId();
            long patientId = request.getPatientId();
            double amount = request.getAmount();

            // Store invoice to MySQL
            Invoice invoice = billingService.createInvoice(appointmentId, patientId, amount);

            // Build protobuf response
            GenerateInvoiceResponse response = GenerateInvoiceResponse.newBuilder()
                    .setInvoiceId(invoice.getId())
                    .setAppointmentId(invoice.getAppointmentId())
                    .setPatientId(invoice.getPatientId())
                    .setAmount(invoice.getAmount())
                    .setStatus(invoice.getStatus())
                    .setGeneratedAt(invoice.getGeneratedAt().format(DateTimeFormatter.ISO_DATE_TIME))
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription("Error generating invoice: " + e.getMessage())
                    .asRuntimeException());
        }
    }
}
