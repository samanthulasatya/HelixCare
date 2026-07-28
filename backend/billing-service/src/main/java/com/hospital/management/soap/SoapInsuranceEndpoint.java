package com.hospital.management.soap;

import com.hospital.management.service.BillingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;

@Endpoint
public class SoapInsuranceEndpoint {

    private static final String NAMESPACE_URI = "http://hospital.com/management/soap/generated";

    @Autowired
    private BillingService billingService;

    @PayloadRoot(namespace = NAMESPACE_URI, localPart = "VerifyInsuranceRequest")
    @ResponsePayload
    public VerifyInsuranceResponse verifyInsurance(@RequestPayload VerifyInsuranceRequest request) {
        VerifyInsuranceResponse response = new VerifyInsuranceResponse();
        double[] coverage = new double[1];
        
        boolean verified = billingService.verifyInsurance(
                request.getPolicyNumber(),
                request.getProvider(),
                request.getClaimAmount(),
                coverage
        );
        
        response.setIsVerified(verified);
        response.setCoverageAmount(coverage[0]);
        if (verified) {
            response.setStatusMessage("Insurance coverage approved. Covered amount: $" + coverage[0]);
        } else {
            response.setStatusMessage("Insurance coverage declined. Check policy status.");
        }
        
        return response;
    }
}
