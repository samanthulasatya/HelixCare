import React, { useState, useEffect } from 'react';

const SERVICES = {
    BILLING: 'https://helixcare.duckdns.org'
};

export default function SoapInsurance({ user, token }) {
    const [policy, setPolicy] = useState('POL-GOLD-9827');
    const [provider, setProvider] = useState('BlueCross');
    const [amount, setAmount] = useState('250');
    
    // Invoices database states
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // SOAP Receipt display state
    const [loading, setLoading] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState(null);

    // Payment Form states
    const [cardNumber, setCardNumber] = useState('');
    const [cvv, setCvv] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(null);
    const [paymentError, setPaymentError] = useState(null);

    // Fetch invoices on mount
    const loadInvoices = () => {
        if (!user) return;
        const url = user.role === 'PATIENT' ? 
            `${SERVICES.BILLING}/api/billing/invoices/patient/${user.id}` :
            `${SERVICES.BILLING}/api/billing/invoices`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("Could not load invoices");
            return res.json();
        })
        .then(data => {
            setInvoices(data);
        })
        .catch(err => console.error("Error fetching invoices:", err));
    };

    useEffect(() => {
        loadInvoices();
    }, [user, token]);

    const handleInvoiceChange = (invoiceId) => {
        if (!invoiceId) {
            setSelectedInvoice(null);
            return;
        }
        const inv = invoices.find(i => i.id === parseInt(invoiceId));
        if (inv) {
            setSelectedInvoice(inv);
            setAmount(inv.amount.toString());
            // Clear prior states
            setReceipt(null);
            setPaymentSuccess(null);
            setPaymentError(null);
        }
    };

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
        setPaymentSuccess(null);
        setPaymentError(null);

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

            const policyUpper = policy.toUpperCase();
            let tierLabel = "UNKNOWN";
            let tierColor = "#a78bfa";
            let copayVal = 0.0;
            let deductibleVal = 0.0;
            let coinsuranceVal = 0;
            let limitVal = "None";

            if (policyUpper.includes("GOLD")) {
                tierLabel = "GOLD POLICY TIER";
                tierColor = "#ffd700";
                copayVal = 10.0;
                deductibleVal = 0.0;
                coinsuranceVal = 100;
            } else if (policyUpper.includes("SILVER")) {
                tierLabel = "SILVER POLICY TIER";
                tierColor = "#c0c0c0";
                copayVal = 0.0;
                deductibleVal = 50.0;
                coinsuranceVal = 80;
            } else if (policyUpper.includes("BRONZE")) {
                tierLabel = "BRONZE POLICY TIER";
                tierColor = "#cd7f32";
                copayVal = 0.0;
                deductibleVal = 0.0;
                coinsuranceVal = 50;
                limitVal = "$500.00 cap";
            } else if (policyUpper.includes("EXPIRED")) {
                tierLabel = "EXPIRED POLICY";
                tierColor = "#ef4444";
            } else {
                tierLabel = "STANDARD BASE POLICY";
                tierColor = "#60a5fa";
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

    const handleProcessPayment = (e) => {
        e.preventDefault();
        if (!selectedInvoice) {
            alert("Please select a valid database invoice first.");
            return;
        }

        setPaymentLoading(true);
        setPaymentSuccess(null);
        setPaymentError(null);

        // Call the gateway pay API
        fetch(`${SERVICES.BILLING}/api/billing/pay`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                invoiceId: selectedInvoice.id,
                cardNumber: cardNumber,
                cvv: cvv
            })
        })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Payment declined by issuing bank.");
            }
            return res.json();
        })
        .then(updatedInvoice => {
            setPaymentSuccess(updatedInvoice);
            setPaymentLoading(false);
            loadInvoices();
            setSelectedInvoice(updatedInvoice);
        })
        .catch(err => {
            setPaymentError(err.message);
            setPaymentLoading(false);
        });
    };

    return (
        <section className="screen active">
            <div className="soap-grid">
                {/* Form Card */}
                <div className="glass-card soap-form-card" style={{ padding: '30px' }}>
                    <h2 className="card-title"><i className="fa-solid fa-file-shield"></i> SOAP Insurance Verification</h2>
                    <p className="subtitle">Select an outstanding invoice, run the SOAP rules engine, and checkout secure payments.</p>
                    
                    <form onSubmit={handleSubmit}>
                        {/* Outstanding invoices selector */}
                        <div className="form-group">
                            <label>Link Database Invoice</label>
                            <select 
                                value={selectedInvoice ? selectedInvoice.id : ''} 
                                onChange={e => handleInvoiceChange(e.target.value)}
                            >
                                <option value="">-- Click to Select Invoice --</option>
                                {invoices.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        Invoice #{inv.id} - ${inv.amount.toFixed(2)} ({inv.status})
                                    </option>
                                ))}
                            </select>
                            <small className="tip" style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Selecting an invoice will automatically populate the claim amount.
                            </small>
                        </div>

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
                                    disabled={!!selectedInvoice}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block">Verify Coverage Policy</button>
                    </form>
                </div>

                {/* Receipt and Checkout Card */}
                <div className="glass-card soap-result-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <h3 className="section-title"><i className="fa-solid fa-receipt"></i> Insurance Coverage Receipt</h3>
                        <p className="subtitle" style={{ marginBottom: '15px' }}>Itemized invoice statement calculated via SOAP endpoint.</p>
                    </div>

                    <div className={`soap-parsed-result ${receipt && !receipt.isVerified ? 'declined' : ''}`} style={{ minHeight: '180px' }}>
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
                                <p>Enter details and link an invoice to calculate policy structures.</p>
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
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
                                    <div className="soap-result-row" style={{ fontSize: '14px', fontWeight: 700 }}>
                                        <span className="lbl" style={{ color: 'var(--color-success)' }}>Insurance Covered</span>
                                        <span className="val approved" style={{ fontSize: '16px' }}>${receipt.coverageAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="soap-result-row" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
                                        <span className="lbl">Out-of-Pocket Cost</span>
                                        <span className="val" style={{ fontSize: '18px', color: 'var(--color-primary-light)' }}>${receipt.outOfPocket.toFixed(2)}</span>
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
                                    <div className="soap-result-row" style={{ fontSize: '14px', fontWeight: 700 }}>
                                        <span className="lbl">Insurance Covered</span>
                                        <span className="val declined" style={{ fontSize: '16px' }}>$0.00</span>
                                    </div>
                                    <div className="soap-result-row" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
                                        <span className="lbl">Out-of-Pocket Cost</span>
                                        <span className="val" style={{ fontSize: '18px', color: 'var(--color-primary-light)' }}>${receipt.claimAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            )
                        )}
                    </div>

                    {/* Integrated Secure Payment Checkout Section */}
                    {receipt && selectedInvoice && (
                        <div className="payment-checkout-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary-light)' }}></i> Secure Bill Settlement
                            </h4>

                            {selectedInvoice.status === 'PAID' || paymentSuccess ? (
                                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '15px', borderRadius: '12px', textAlign: 'center', color: '#6ee7b7' }}>
                                    <i className="fa-solid fa-circle-check" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}></i>
                                    <strong style={{ fontSize: '13.5px' }}>Invoice Fully Paid!</strong>
                                    <p style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.7)', margin: '5px 0 0 0' }}>
                                        Transaction completed. Receipt logged to DB.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Amount to Charge Card:</span>
                                        <strong style={{ color: 'var(--color-primary-light)' }}>${receipt.outOfPocket.toFixed(2)}</strong>
                                    </div>

                                    <div className="form-group" style={{ margin: 0 }}>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Enter Credit Card Number (16 digits)" 
                                            value={cardNumber}
                                            onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                                            style={{ fontSize: '12.5px', padding: '10px 14px' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Expiry (MM/YY)" 
                                            style={{ fontSize: '12.5px', padding: '10px 14px' }}
                                        />
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="CVV (3 digits)" 
                                            value={cvv}
                                            onChange={e => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                                            style={{ fontSize: '12.5px', padding: '10px 14px' }}
                                        />
                                    </div>

                                    {paymentError && (
                                        <div style={{ fontSize: '11.5px', color: 'var(--color-danger)', fontWeight: 600 }}>
                                            <i className="fa-solid fa-triangle-exclamation"></i> {paymentError}
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        disabled={paymentLoading}
                                        style={{ width: '100%', padding: '10px', fontSize: '12.5px', cursor: 'pointer' }}
                                    >
                                        {paymentLoading ? (
                                            <>
                                                <i className="fa-solid fa-spinner fa-spin"></i> Processing Charge...
                                            </>
                                        ) : (
                                            `Authorize & Pay $${receipt.outOfPocket.toFixed(2)}`
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
