import React, { useState } from 'react';

const SERVICES = {
    BILLING: 'http://16.16.208.91:8088'
};

export default function SoapInsurance() {
    const [policy, setPolicy] = useState('POL-GOLD-9827');
    const [provider, setProvider] = useState('BlueCross');
    const [amount, setAmount] = useState('250');
    
    // Receipt display state
    const [loading, setLoading] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState(null);

    const escapeXml = (unsafe) => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    };

    const getXmlValue = (xmlDoc, tagName) => {
        let tags = xmlDoc.getElementsByTagName(tagName);
        if (tags.length > 0) return tags[0].textContent;
        tags = xmlDoc.getElementsByTagNameNS("*", tagName);
        if (tags.length > 0) return tags[0].textContent;
        return "";
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setReceipt(null);
        setError(null);

        const parsedAmount = parseFloat(amount) || 0;

        // 1. Build Raw XML SOAP request matching JAXB schema
        const rawXmlReq = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:gen="http://hospital.com/management/soap/generated">
   <soapenv:Header/>
   <soapenv:Body>
      <gen:VerifyInsuranceRequest>
         <gen:policyNumber>${escapeXml(policy)}</gen:policyNumber>
         <gen:provider>${escapeXml(provider)}</gen:provider>
         <gen:claimAmount>${parsedAmount}</gen:claimAmount>
      </gen:VerifyInsuranceRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

        // 2. POST to SOAP servlet ws endpoint
        fetch(`${SERVICES.BILLING}/ws`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml;charset=utf-8' },
            body: rawXmlReq
        })
        .then(res => {
            if (!res.ok) throw new Error("SOAP Server returned error: " + res.status);
            return res.text();
        })
        .then(xmlStr => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
            
            const isVerifiedStr = getXmlValue(xmlDoc, "isVerified");
            const coverageAmountStr = getXmlValue(xmlDoc, "coverageAmount");
            const statusMessage = getXmlValue(xmlDoc, "statusMessage");

            const isVerified = isVerifiedStr === "true";
            const coverageAmount = parseFloat(coverageAmountStr) || 0.0;

            // Determine Policy UI variables based on code prefix
            const policyUpper = policy.toUpperCase();
            let tierLabel = "UNKNOWN";
            let tierColor = "#a78bfa"; // purple
            let copayVal = 0.0;
            let deductibleVal = 0.0;
            let coinsuranceVal = 0;
            let limitVal = "None";

            if (policyUpper.includes("GOLD")) {
                tierLabel = "GOLD POLICY TIER";
                tierColor = "#ffd700"; // gold
                copayVal = 10.0;
                deductibleVal = 0.0;
                coinsuranceVal = 100;
            } else if (policyUpper.includes("SILVER")) {
                tierLabel = "SILVER POLICY TIER";
                tierColor = "#c0c0c0"; // silver
                copayVal = 0.0;
                deductibleVal = 50.0;
                coinsuranceVal = 80;
            } else if (policyUpper.includes("BRONZE")) {
                tierLabel = "BRONZE POLICY TIER";
                tierColor = "#cd7f32"; // bronze
                copayVal = 0.0;
                deductibleVal = 0.0;
                coinsuranceVal = 50;
                limitVal = "$500.00 cap";
            } else if (policyUpper.includes("EXPIRED")) {
                tierLabel = "EXPIRED POLICY";
                tierColor = "#ef4444"; // red
            } else {
                tierLabel = "STANDARD BASE POLICY";
                tierColor = "#60a5fa"; // blue
                coinsuranceVal = 60;
                limitVal = "$300.00 cap";
            }

            setReceipt({
                isVerified,
                coverageAmount,
                statusMessage,
                policyCode: policy,
                tierLabel,
                tierColor,
                copayVal,
                deductibleVal,
                coinsuranceVal,
                limitVal,
                claimAmount: parsedAmount,
                outOfPocket: isVerified ? (parsedAmount - coverageAmount) : parsedAmount
            });
            setLoading(false);
        })
        .catch(err => {
            setError(err.message);
            setLoading(false);
        });
    };

    return (
        <section className="screen active">
            <div className="soap-grid">
                {/* Form Card */}
                <div className="glass-card soap-form-card" style={{ padding: '30px' }}>
                    <h2 className="card-title"><i className="fa-solid fa-file-shield"></i> SOAP Insurance Verification</h2>
                    <p className="subtitle">Simulate real-time insurance validation via external medical networks.</p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Insurance Policy Number</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="e.g. POL-GOLD-455" 
                                value={policy} 
                                onChange={e => setPolicy(e.target.value)} 
                            />
                            <small className="tip" style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Supported Tiers: <strong>POL-GOLD-***</strong>, <strong>POL-SILVER-***</strong>, <strong>POL-BRONZE-***</strong>, <strong>POL-EXPIRED-***</strong>.
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Insurance Provider Link</label>
                            <select value={provider} onChange={e => setProvider(e.target.value)}>
                                <option value="BlueCross">BlueCross Insurance Inc.</option>
                                <option value="Aetna">Aetna Private Health</option>
                                <option value="UnitedHealth">UnitedHealth Group</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Invoice Claim Amount ($)</label>
                            <div className="input-icon-wrapper">
                                <i className="fa-solid fa-dollar-sign"></i>
                                <input 
                                    type="number" 
                                    required 
                                    min="1" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block">Verify Coverage Policy</button>
                    </form>
                </div>

                {/* Receipt Card */}
                <div className="glass-card soap-result-card" style={{ padding: '30px' }}>
                    <h3 className="section-title"><i className="fa-solid fa-receipt"></i> Insurance Coverage Receipt</h3>
                    <p className="subtitle" style={{ marginBottom: '15px' }}>Itemized invoice deduction statement calculated via SOAP endpoint.</p>
                    
                    <div className={`soap-parsed-result ${receipt && !receipt.isVerified ? 'declined' : ''}`} style={{ minHeight: '220px' }}>
                        {loading && (
                            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: 'auto' }}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px', marginBottom: '10px' }}></i>
                                <p>Executing SOAP call...</p>
                            </div>
                        )}
                        
                        {error && (
                            <div style={{ textAlign: 'center', color: 'var(--color-danger)', margin: 'auto' }}>
                                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '35px', marginBottom: '10px' }}></i>
                                <p>SOAP Failure: {error}</p>
                            </div>
                        )}

                        {!loading && !error && !receipt && (
                            <div className="soap-placeholder" style={{ margin: 'auto' }}>
                                <i className="fa-solid fa-file-invoice-dollar"></i>
                                <p>Enter details on the left and submit to verify policy coverage structures.</p>
                            </div>
                        )}

                        {!loading && !error && receipt && (
                            receipt.isVerified ? (
                                <>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                        <h4 style={{ fontSize: '15.5px', color: 'var(--color-success)', fontWeight: 700, margin: 0 }}>
                                            <i className="fa-solid fa-circle-check"></i> Policy Coverage Active
                                        </h4>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Policy Tier</span>
                                        <span className="val" style={{ color: receipt.tierColor, fontWeight: 700 }}>{receipt.tierLabel}</span>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Policy Code</span>
                                        <span className="val">{receipt.policyCode}</span>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '12px 0' }} />
                                    <div className="soap-result-row">
                                        <span className="lbl">Subtotal Claim</span>
                                        <span className="val">${receipt.claimAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Deductible Applied</span>
                                        <span className="val">${receipt.deductibleVal.toFixed(2)}</span>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Copay Fee</span>
                                        <span className="val">${receipt.copayVal.toFixed(2)}</span>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Co-insurance Rate</span>
                                        <span className="val">{receipt.coinsuranceVal}%</span>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Coverage Limit cap</span>
                                        <span className="val">{receipt.limitVal}</span>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
                                    <div className="soap-result-row" style={{ fontSize: '15px', fontWeight: 700 }}>
                                        <span className="lbl" style={{ color: 'var(--color-success)' }}>Insurance Covered</span>
                                        <span className="val approved" style={{ fontSize: '18px' }}>${receipt.coverageAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="soap-result-row" style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>
                                        <span className="lbl">Out-of-Pocket Cost</span>
                                        <span className="val" style={{ fontSize: '16px' }}>${receipt.outOfPocket.toFixed(2)}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                        <h4 style={{ fontSize: '15.5px', color: 'var(--color-danger)', fontWeight: 700, margin: 0 }}>
                                            <i className="fa-solid fa-circle-xmark"></i> Verification Declined
                                        </h4>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Policy Code</span>
                                        <span className="val">{receipt.policyCode}</span>
                                    </div>
                                    <div className="soap-result-row">
                                        <span className="lbl">Status</span>
                                        <span className="val declined" style={{ fontWeight: 700 }}>INACTIVE / EXPIRED</span>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '12px 0' }} />
                                    <div className="soap-result-row" style={{ flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                        <span className="lbl" style={{ fontSize: '10px' }}>Verification Message</span>
                                        <span className="val declined" style={{ fontSize: '12.5px' }}>{receipt.statusMessage}</span>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
                                    <div className="soap-result-row" style={{ fontSize: '15px', fontWeight: 700 }}>
                                        <span className="lbl">Insurance Covered</span>
                                        <span className="val declined" style={{ fontSize: '18px' }}>$0.00</span>
                                    </div>
                                    <div className="soap-result-row" style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>
                                        <span className="lbl">Out-of-Pocket Cost</span>
                                        <span className="val" style={{ fontSize: '16px' }}>${receipt.claimAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            )
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
