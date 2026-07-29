import React, { useState, useRef } from 'react';

const SERVICES = {
    BILLING: 'https://helixcare.duckdns.org'
};

export default function Chat({ 
    user, 
    appointments, 
    selectedChatSession, 
    onSelectSession, 
    chatMessages, 
    onSendMessage, 
    onClearHistory, 
    onStartCall,
    onAddNotification,
    searchQuery
}) {
    const [text, setText] = useState('');
    const fileInputRef = useRef(null);

    // Doctor drawer states
    const [drawerTab, setDrawerTab] = useState('notes'); // 'notes' | 'rx'
    const [soapSubjective, setSoapSubjective] = useState('');
    const [soapObjective, setSoapObjective] = useState('');
    const [soapAssessment, setSoapAssessment] = useState('');
    const [soapPlan, setSoapPlan] = useState('');
    
    // Billing invoice states
    const [billingAmount, setBillingAmount] = useState('150');
    const [billingLoading, setBillingLoading] = useState(false);

    // E-Rx states
    const [rxMedication, setRxMedication] = useState('');
    const [rxDosage, setRxDosage] = useState('');
    const [rxInstructions, setRxInstructions] = useState('');
    const [rxRefills, setRxRefills] = useState('No refills');

    // Dynamic shared files state for doctor lookup
    const [sharedFiles, setSharedFiles] = useState([]);

    const loadSharedFiles = () => {
        if (!selectedChatSession) return;
        const patientId = selectedChatSession.patient.id;
        fetch(`https://helixcare.duckdns.org/api/patients/${patientId}/documents`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('helix_token')}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("Could not load documents");
            return res.json();
        })
        .then(data => setSharedFiles(data))
        .catch(err => {
            console.warn("REST vault error, loading local data fallback:", err);
            const local = localStorage.getItem(`helix_vault_${patientId}`) || '[]';
            setSharedFiles(JSON.parse(local));
        });
    };

    React.useEffect(() => {
        if (drawerTab === 'files' && selectedChatSession) {
            loadSharedFiles();
        }
    }, [drawerTab, selectedChatSession]);

    const handleSend = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setText('');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            alert("File size exceeds the 1MB limit. Please upload a smaller file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result;
            onSendMessage(`[FILE:${file.name}:${file.type}]${base64Data}`);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // AI SOAP Notes summarizer logic
    const handleGenerateSoapNote = () => {
        const chatLogs = chatMessages.map(m => m.content.toLowerCase()).join(' ');

        let symptoms = [];
        if (chatLogs.includes('throat') || chatLogs.includes('cough') || chatLogs.includes('fever') || chatLogs.includes('cold')) {
            symptoms.push('Patient complaining of throat pain, coughing, and elevated body temperature.');
        }
        if (chatLogs.includes('stomach') || chatLogs.includes('pain') || chatLogs.includes('vomit') || chatLogs.includes('nausea')) {
            symptoms.push('Patient reports abdominal cramps, nausea, and recent vomiting spells.');
        }
        if (chatLogs.includes('head') || chatLogs.includes('migraine') || chatLogs.includes('stress')) {
            symptoms.push('Client complaining of recurring temporal headaches accompanied by fatigue.');
        }
        if (symptoms.length === 0) {
            symptoms.push('Patient reports general fatigue, body aches, and requested a routine clinical follow-up.');
        }

        let diagnosis = 'General Consultation Follow-up';
        if (chatLogs.includes('throat') || chatLogs.includes('cough')) diagnosis = 'Acute Viral Pharyngitis';
        else if (chatLogs.includes('stomach') || chatLogs.includes('vomit')) diagnosis = 'Acute Gastroenteritis';
        else if (chatLogs.includes('head') || chatLogs.includes('migraine')) diagnosis = 'Tension Headache';

        setSoapSubjective(symptoms.join(' '));
        setSoapObjective('Vitals stable. Throat Congested. Lungs clear on auscultation.');
        setSoapAssessment(diagnosis);
        setSoapPlan('Rest, hydration. Prescription written for symptom relief. Follow-up in 3 days.');
    };

    // Submit invoice claim to DB
    const handleSubmitClaim = (e) => {
        e.preventDefault();
        if (!selectedChatSession) return;

        setBillingLoading(true);
        fetch(`${SERVICES.BILLING}/api/billing/invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('helix_token')}`
            },
            body: JSON.stringify({
                appointmentId: selectedChatSession.id,
                patientId: selectedChatSession.patient.id,
                amount: parseFloat(billingAmount) || 150
            })
        })
        .then(res => {
            if (!res.ok) throw new Error("Could not submit claim invoice");
            return res.json();
        })
        .then(invoice => {
            setBillingLoading(false);
            // Send system message in chat
            onSendMessage(`[System Alert] Outstanding Billing Invoice #${invoice.id} for $${invoice.amount.toFixed(2)} was generated.`);
            // Add persistent notification
            if (onAddNotification) {
                onAddNotification(`New Billing Invoice #${invoice.id} created for patient ${selectedChatSession.patient.firstName}.`);
            }
            alert(`Claim invoice #${invoice.id} successfully created! Patient can now verify and pay under SOAP tab.`);
        })
        .catch(err => {
            setBillingLoading(false);
            alert("Billing claim failed: " + err.message);
        });
    };

    // Send E-Prescription over chat WebSockets
    const handleSendPrescription = (e) => {
        e.preventDefault();
        if (!rxMedication || !rxDosage) {
            alert("Medication name and dosage instructions are required.");
            return;
        }

        const rxObj = {
            medication: rxMedication,
            dosage: rxDosage,
            instructions: rxInstructions || 'Take as directed.',
            refills: rxRefills,
            doctor: `Dr. ${user.username}`,
            date: new Date().toLocaleDateString()
        };

        // Broadcast prescription token: [PRESCRIPTION:jsonStr]
        onSendMessage(`[PRESCRIPTION:${JSON.stringify(rxObj)}]`);

        // Clear Rx Form
        setRxMedication('');
        setRxDosage('');
        setRxInstructions('');
        setRxRefills('No refills');
        alert("Prescription sent to patient successfully!");
    };

    const activeList = appointments.filter(a => a.status !== 'CANCELLED');
    const filteredList = activeList.filter(a => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const name = user.role === 'PATIENT' ? 
            `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 
            `${a.patient.firstName} ${a.patient.lastName}`;
        const specialization = a.doctor.specialization || '';
        return name.toLowerCase().includes(query) || 
               specialization.toLowerCase().includes(query) ||
               String(a.id).includes(query);
    });

    return (
        <section className="screen active" style={{ padding: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="chat-container" style={{ height: '100%', borderRadius: 0, border: 'none', width: '100%' }}>
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <h3 style={{ fontSize: '15px', fontWeight: 700, padding: '15px 20px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                        Active Consultations
                    </h3>
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1 }}>
                        {filteredList.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '20px' }}>
                                No matching consultation links.
                            </p>
                        ) : (
                            filteredList.map(a => {
                                const name = user.role === 'PATIENT' ? 
                                    `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 
                                    `${a.patient.firstName} ${a.patient.lastName}`;
                                const isSelected = selectedChatSession && selectedChatSession.id === a.id;
                                
                                return (
                                    <button 
                                        key={a.id}
                                        className={`chat-session-btn ${isSelected ? 'active' : ''}`}
                                        onClick={() => onSelectSession(a)}
                                    >
                                        <div className="avatar">
                                            <i className={user.role === 'PATIENT' ? "fa-solid fa-user-doctor" : "fa-solid fa-hospital-user"}></i>
                                        </div>
                                        <div style={{ textAlign: 'left', flexGrow: 1, minWidth: 0 }}>
                                            <div className="name">{name}</div>
                                            <div className="specialty">{a.doctor.specialization}</div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Content Body and Doctor Scribe Drawer */}
                <div style={{ display: 'grid', gridTemplateColumns: (user.role === 'DOCTOR' && selectedChatSession) ? '1fr 360px' : '1fr', height: '100%', width: '100%', overflow: 'hidden' }}>
                    
                    {/* Left: Chat room dialogue area */}
                    <div className="chat-body" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {selectedChatSession ? (
                            <>
                                {/* Header */}
                                <div className="chat-header">
                                    <div>
                                        <h4 className="title" style={{ margin: 0 }}>
                                            {user.role === 'PATIENT' ? 
                                                `Dr. ${selectedChatSession.doctor.firstName} ${selectedChatSession.doctor.lastName}` : 
                                                `${selectedChatSession.patient.firstName} ${selectedChatSession.patient.lastName}`}
                                        </h4>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                            Appt ID: #{selectedChatSession.id} • {selectedChatSession.doctor.specialization}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="btn btn-primary" onClick={onStartCall} style={{ gap: '6px', fontSize: '12.5px', padding: '8px 16px' }}>
                                            <i className="fa-solid fa-video"></i> Start Video Call
                                        </button>
                                        <button className="btn btn-secondary" onClick={onClearHistory} style={{ fontSize: '12.5px', padding: '8px 16px' }}>
                                            Clear Log
                                        </button>
                                    </div>
                                </div>

                                {/* Messaging Logs */}
                                <div className="chat-logs-viewport">
                                    {chatMessages.map((m, idx) => {
                                        if (m.sender === 'System' || m.sender === 'System Alert' || m.content.startsWith('[System Alert]')) {
                                            return (
                                                <div 
                                                    key={idx} 
                                                    style={{
                                                        alignSelf: 'center',
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        textAlign: 'center',
                                                        borderRadius: '8px',
                                                        maxWidth: '90%',
                                                        border: '1px dashed rgba(255,255,255,0.1)',
                                                        margin: '5px 0',
                                                        fontSize: '12px',
                                                        padding: '6px 12px',
                                                        color: 'var(--color-text-muted)'
                                                    }}
                                                >
                                                    <i className="fa-solid fa-circle-info" style={{ color: 'var(--color-primary-light)', marginRight: '5px' }}></i>
                                                    {m.content}
                                                </div>
                                            );
                                        }

                                        const isMe = m.sender === user.username;
                                        const isFile = m.content && m.content.startsWith('[FILE:');
                                        const isPrescription = m.content && m.content.startsWith('[PRESCRIPTION:');
                                        
                                        let fileData = null;
                                        let rxData = null;

                                        if (isFile) {
                                            try {
                                                const closeTagIndex = m.content.indexOf(']');
                                                if (closeTagIndex > 6) {
                                                    const meta = m.content.substring(6, closeTagIndex).split(':');
                                                    const filename = meta[0];
                                                    const mime = meta[1];
                                                    const dataUrl = m.content.substring(closeTagIndex + 1);
                                                    fileData = { filename, mime, dataUrl };
                                                }
                                            } catch (e) {
                                                console.error("Error parsing chat file metadata:", e);
                                            }
                                        }

                                        if (isPrescription) {
                                            try {
                                                const firstBrace = m.content.indexOf('{');
                                                const lastBrace = m.content.lastIndexOf('}');
                                                if (firstBrace !== -1 && lastBrace !== -1) {
                                                    let jsonStr = m.content.substring(firstBrace, lastBrace + 1);
                                                    // Handle database/websocket double escaping
                                                    jsonStr = jsonStr.replace(/\\"/g, '"');
                                                    rxData = JSON.parse(jsonStr);
                                                }
                                            } catch (e) {
                                                console.error("Error parsing prescription payload:", e);
                                            }
                                        }

                                        return (
                                            <div key={idx} className={`msg-bubble ${isMe ? 'sent' : 'received'}`}>
                                                <strong style={{ fontSize: '10px', display: 'block', opacity: 0.8, marginBottom: '2px' }}>
                                                    {m.sender}
                                                </strong>
                                                
                                                {isFile && fileData ? (
                                                    <div style={{ marginTop: '5px' }}>
                                                        {fileData.mime.startsWith('image/') ? (
                                                            <div>
                                                                <img 
                                                                    src={fileData.dataUrl} 
                                                                    alt={fileData.filename} 
                                                                    style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '6px', display: 'block', marginBottom: '8px' }} 
                                                                />
                                                                <a 
                                                                    href={fileData.dataUrl} 
                                                                    download={fileData.filename} 
                                                                    style={{ color: 'var(--color-primary-light)', fontSize: '12px', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                                                                >
                                                                    <i className="fa-solid fa-download"></i> Download Image
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <i className="fa-solid fa-file-pdf" style={{ fontSize: '24px', color: '#ef4444' }}></i>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '12.5px', fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {fileData.filename}
                                                                    </span>
                                                                    <a 
                                                                        href={fileData.dataUrl} 
                                                                        download={fileData.filename} 
                                                                        style={{ color: 'var(--color-primary-light)', fontSize: '11px', textDecoration: 'underline', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                                                    >
                                                                        <i className="fa-solid fa-download"></i> Download File
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isPrescription && rxData ? (
                                                    <div style={{ 
                                                        background: 'rgba(10, 8, 22, 0.6)', 
                                                        border: '2px solid rgba(16, 185, 129, 0.4)', 
                                                        borderRadius: '12px', 
                                                        padding: '15px', 
                                                        marginTop: '6px', 
                                                        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                                                        maxWidth: '280px',
                                                        color: '#fff'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', marginBottom: '8px' }}>
                                                            <h5 style={{ margin: 0, fontSize: '12px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                                                <i className="fa-solid fa-file-prescription"></i> HELIXCARE Rx
                                                            </h5>
                                                            <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{rxData.date}</span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase', fontWeight: 600 }}>Medication</div>
                                                            <strong style={{ color: '#fff' }}>{rxData.medication}</strong>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '6px' }}>
                                                            <div>
                                                                <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Dosage</div>
                                                                <span>{rxData.dosage}</span>
                                                            </div>
                                                            <div>
                                                                <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Refills</div>
                                                                <span>{rxData.refills}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Instructions</div>
                                                            <span style={{ fontStyle: 'italic' }}>{rxData.instructions}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', fontSize: '10.5px' }}>
                                                            <div>
                                                                <div style={{ color: 'var(--color-text-muted)', fontSize: '8px' }}>Prescriber</div>
                                                                <strong>{rxData.doctor}</strong>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    const printWin = window.open('', '_blank');
                                                                    printWin.document.write(`
                                                                        <html>
                                                                        <head>
                                                                            <title>HelixCare Rx - ${rxData.medication}</title>
                                                                            <style>
                                                                                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                                                                                .rx-header { border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; }
                                                                                .rx-title { font-size: 24px; font-weight: bold; color: #10b981; }
                                                                                .rx-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                                                                                .rx-section { margin-bottom: 20px; }
                                                                                .rx-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
                                                                                .rx-val { font-size: 16px; font-weight: 600; margin-top: 4px; }
                                                                                .rx-footer { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; display: flex; justify-content: space-between; align-items: center; }
                                                                                .rx-sig { border-bottom: 1px solid #94a3b8; width: 150px; text-align: center; font-style: italic; font-weight: bold; padding-bottom: 5px; }
                                                                            </style>
                                                                        </head>
                                                                        <body onload="window.print()">
                                                                            <div class="rx-header">
                                                                                <div>
                                                                                    <div class="rx-title">🏥 HELIXCARE HOSPITAL CLINIC</div>
                                                                                    <div style="font-size:12px;color:#64748b">Secure Electronic Prescription Network</div>
                                                                                </div>
                                                                                <div style="text-align:right">
                                                                                    <div><strong>Rx ID: #${Date.now().toString().substring(6)}</strong></div>
                                                                                    <div style="font-size:12px;color:#64748b">Date: ${rxData.date}</div>
                                                                                </div>
                                                                            </div>
                                                                            <div class="rx-detail-grid">
                                                                                <div>
                                                                                    <div class="rx-label">Patient Record Details</div>
                                                                                    <div class="rx-val">HelixCare Clinical Consult</div>
                                                                                </div>
                                                                                <div>
                                                                                    <div class="rx-label">Refills Authorized</div>
                                                                                    <div class="rx-val">${rxData.refills}</div>
                                                                                </div>
                                                                            </div>
                                                                            <div class="rx-section">
                                                                                <div class="rx-label">Prescribed Medication</div>
                                                                                <div class="rx-val" style="font-size:20px;color:#0f172a">${rxData.medication}</div>
                                                                            </div>
                                                                            <div class="rx-section">
                                                                                <div class="rx-label">Dosage Rate</div>
                                                                                <div class="rx-val">${rxData.dosage}</div>
                                                                            </div>
                                                                            <div class="rx-section">
                                                                                <div class="rx-label">Patient Directions</div>
                                                                                <div class="rx-val">${rxData.instructions}</div>
                                                                            </div>
                                                                            <div class="rx-footer">
                                                                                <div>
                                                                                    <div class="rx-label">Digital Verification Code</div>
                                                                                    <div style="font-family:monospace;font-size:11px;color:#64748b">HLX-RX-SECURE-${Math.random().toString(36).substring(3, 9).toUpperCase()}</div>
                                                                                </div>
                                                                                <div style="text-align:right">
                                                                                    <div class="rx-sig">${rxData.doctor}</div>
                                                                                    <div class="rx-label" style="margin-top:5px">Authorized Clinician Signature</div>
                                                                                </div>
                                                                            </div>
                                                                        </body>
                                                                        </html>
                                                                    `);
                                                                    printWin.document.close();
                                                                }}
                                                                className="btn btn-secondary" 
                                                                style={{ fontSize: '9px', padding: '4px 6px', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', cursor: 'pointer' }}
                                                            >
                                                                <i className="fa-solid fa-print"></i> Print Rx
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    m.content
                                                )}

                                                <span className="time">{m.timestamp}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Chat input controls */}
                                <form onSubmit={handleSend} className="chat-input-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileSelect} 
                                        style={{ display: 'none' }} 
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                        style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Attach Document/Image"
                                    >
                                        <i className="fa-solid fa-paperclip"></i>
                                    </button>
                                    <input 
                                        type="text" 
                                        placeholder="Enter your message..." 
                                        value={text} 
                                        onChange={e => setText(e.target.value)} 
                                        style={{ flexGrow: 1 }}
                                    />
                                    <button type="submit" className="btn btn-primary" style={{ borderRadius: '20px', padding: '10px 20px' }}>
                                        Send
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="chat-welcome-placeholder">
                                <i className="fa-solid fa-comments-dollar"></i>
                                <h3>Telemedicine Consultation Portal</h3>
                                <p>Select a scheduled appointment session from the sidebar to engage in secure messaging and video calls with your provider.</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Doctor Scribe and Rx Drawer (only visible to Doctors with active chats) */}
                    {user.role === 'DOCTOR' && selectedChatSession && (
                        <div className="chat-drawer" style={{ 
                            background: 'rgba(0, 0, 0, 0.15)', 
                            borderLeft: '1px solid var(--border-color)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%', 
                            overflowY: 'auto', 
                            padding: '20px',
                            gap: '15px' 
                        }}>
                            {/* Tabs Header */}
                            <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <button 
                                    className={`btn ${drawerTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setDrawerTab('notes')}
                                    style={{ flex: 1, padding: '8px', fontSize: '11px' }}
                                >
                                    📝 SOAP Note
                                </button>
                                <button 
                                    className={`btn ${drawerTab === 'rx' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setDrawerTab('rx')}
                                    style={{ flex: 1, padding: '8px', fontSize: '11px' }}
                                >
                                    💊 Write Rx
                                </button>
                                <button 
                                    className={`btn ${drawerTab === 'files' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setDrawerTab('files')}
                                    style={{ flex: 1, padding: '8px', fontSize: '11px' }}
                                >
                                    🗂️ Patient Files
                                </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                            {drawerTab === 'notes' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>Clinical SOAP Charting</h4>
                                        <button 
                                            onClick={handleGenerateSoapNote}
                                            className="btn btn-secondary" 
                                            style={{ fontSize: '10px', padding: '4px 8px', gap: '3px' }}
                                        >
                                            <i className="fa-solid fa-wand-magic-sparkles"></i> Scribe AI
                                        </button>
                                    </div>

                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Subjective (Symptoms)</label>
                                        <textarea 
                                            value={soapSubjective} 
                                            onChange={e => setSoapSubjective(e.target.value)} 
                                            placeholder="Patient reported complaints..."
                                            style={{ width: '100%', height: '55px', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Objective (Observations)</label>
                                        <textarea 
                                            value={soapObjective} 
                                            onChange={e => setSoapObjective(e.target.value)} 
                                            placeholder="Vitals, auscultations, checks..."
                                            style={{ width: '100%', height: '55px', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Assessment (Diagnosis)</label>
                                        <input 
                                            type="text"
                                            value={soapAssessment} 
                                            onChange={e => setSoapAssessment(e.target.value)} 
                                            placeholder="Suggested diagnosis..."
                                            style={{ width: '100%', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Plan (Actions)</label>
                                        <textarea 
                                            value={soapPlan} 
                                            onChange={e => setSoapPlan(e.target.value)} 
                                            placeholder="Recovery schedule, treatments..."
                                            style={{ width: '100%', height: '55px', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>

                                    {/* Insurance Claim Generator Form */}
                                    <form onSubmit={handleSubmitClaim} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                                        <h5 style={{ margin: '0 0 5px 0', fontSize: '12.5px', fontWeight: 700 }}>
                                            <i className="fa-solid fa-paper-plane" style={{ color: 'var(--color-primary-light)' }}></i> File Claim Invoice
                                        </h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Claim Settle Amount:</span>
                                            <input 
                                                type="number" 
                                                required
                                                min="1"
                                                value={billingAmount}
                                                onChange={e => setBillingAmount(e.target.value)}
                                                style={{ fontSize: '12px', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', textAlign: 'center' }}
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary" 
                                            disabled={billingLoading}
                                            style={{ width: '100%', padding: '8px', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            {billingLoading ? 'Filing Claim...' : 'Submit Claim Invoice'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {drawerTab === 'rx' && (
                                <form onSubmit={handleSendPrescription} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>Write Rx Prescription</h4>
                                    
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11.5px' }}>Medication Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. Amoxicillin 500mg"
                                            value={rxMedication}
                                            onChange={e => setRxMedication(e.target.value)}
                                            style={{ width: '100%', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11.5px' }}>Dosage Rate</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. 1 tablet three times daily"
                                            value={rxDosage}
                                            onChange={e => setRxDosage(e.target.value)}
                                            style={{ width: '100%', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11.5px' }}>Instructions</label>
                                        <textarea 
                                            placeholder="e.g. Take with food, finish course..."
                                            value={rxInstructions}
                                            onChange={e => setRxInstructions(e.target.value)}
                                            style={{ width: '100%', height: '55px', fontSize: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '11.5px' }}>Refills Allowed</label>
                                        <select 
                                            value={rxRefills} 
                                            onChange={e => setRxRefills(e.target.value)}
                                            style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-color)' }}
                                        >
                                            <option value="No refills">No Refills Authorized</option>
                                            <option value="1 refill">1 Refill</option>
                                            <option value="2 refills">2 Refills</option>
                                            <option value="5 refills">5 Refills</option>
                                        </select>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '10px', fontSize: '12.5px', marginTop: '10px', cursor: 'pointer' }}
                                    >
                                        Send Rx to Patient Chat
                                    </button>
                                </form>
                            )}

                            {drawerTab === 'files' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>Patient Shared Files</h4>
                                    <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: 0 }}>
                                        Documents uploaded by this patient inside their Digital Vault.
                                    </p>
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />
                                    
                                    {(() => {
                                        const files = sharedFiles;

                                        if (files.length === 0) {
                                            return (
                                                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)' }}>
                                                    <i className="fa-solid fa-folder-open" style={{ fontSize: '32px', opacity: 0.2, marginBottom: '8px' }}></i>
                                                    <div style={{ fontSize: '12px' }}>No documents uploaded by this patient.</div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {files.map(file => {
                                                    const isImg = file.type && file.type.startsWith('image/');
                                                    return (
                                                        <div 
                                                            key={file.id} 
                                                            style={{ 
                                                                padding: '10px', 
                                                                border: '1px solid var(--border-color)', 
                                                                borderRadius: '8px', 
                                                                background: 'rgba(255,255,255,0.01)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                {file.category === 'Prescription' ? (
                                                                    <i className="fa-solid fa-prescription-bottle-medical" style={{ fontSize: '18px', color: '#10b981' }}></i>
                                                                ) : file.category === 'X-Ray / Scan' ? (
                                                                    <i className="fa-solid fa-x-ray" style={{ fontSize: '18px', color: '#3b82f6' }}></i>
                                                                ) : file.category === 'Lab Report' ? (
                                                                    <i className="fa-solid fa-droplet" style={{ fontSize: '18px', color: '#ef4444' }}></i>
                                                                ) : (
                                                                    <i className="fa-solid fa-file-medical" style={{ fontSize: '18px', color: '#a78bfa' }}></i>
                                                                )}
                                                                <div style={{ minWidth: 0, flexGrow: 1 }}>
                                                                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                                                        {file.category}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                                                        {file.name}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isImg && (
                                                                <img 
                                                                    src={file.dataUrl} 
                                                                    alt={file.name} 
                                                                    style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} 
                                                                />
                                                            )}

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                                                <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{file.timestamp}</span>
                                                                <a 
                                                                    href={file.dataUrl} 
                                                                    download={file.name} 
                                                                    className="btn btn-secondary" 
                                                                    style={{ padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                                                                >
                                                                    <i className="fa-solid fa-download"></i> Get
                                                                </a>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
