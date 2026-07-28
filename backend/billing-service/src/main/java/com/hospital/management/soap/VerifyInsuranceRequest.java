package com.hospital.management.soap;

import jakarta.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "", propOrder = {
    "policyNumber",
    "provider",
    "claimAmount"
})
@XmlRootElement(name = "VerifyInsuranceRequest", namespace = "http://hospital.com/management/soap/generated")
public class VerifyInsuranceRequest {

    @XmlElement(required = true, namespace = "http://hospital.com/management/soap/generated")
    private String policyNumber;

    @XmlElement(required = true, namespace = "http://hospital.com/management/soap/generated")
    private String provider;

    @XmlElement(namespace = "http://hospital.com/management/soap/generated")
    private double claimAmount;

    public String getPolicyNumber() {
        return policyNumber;
    }

    public void setPolicyNumber(String policyNumber) {
        this.policyNumber = policyNumber;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public double getClaimAmount() {
        return claimAmount;
    }

    public void setClaimAmount(double claimAmount) {
        this.claimAmount = claimAmount;
    }
}
