package com.hospital.management.soap;

import jakarta.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "", propOrder = {
    "isVerified",
    "coverageAmount",
    "statusMessage"
})
@XmlRootElement(name = "VerifyInsuranceResponse", namespace = "http://hospital.com/management/soap/generated")
public class VerifyInsuranceResponse {

    @XmlElement(namespace = "http://hospital.com/management/soap/generated")
    private boolean isVerified;

    @XmlElement(namespace = "http://hospital.com/management/soap/generated")
    private double coverageAmount;

    @XmlElement(required = true, namespace = "http://hospital.com/management/soap/generated")
    private String statusMessage;

    public boolean isIsVerified() {
        return isVerified;
    }

    public void setIsVerified(boolean isVerified) {
        this.isVerified = isVerified;
    }

    public double getCoverageAmount() {
        return coverageAmount;
    }

    public void setCoverageAmount(double coverageAmount) {
        this.coverageAmount = coverageAmount;
    }

    public String getStatusMessage() {
        return statusMessage;
    }

    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }
}
