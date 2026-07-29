import React, { useState, useRef } from 'react';

export default function Chat({ 
    user, 
    appointments, 
    selectedChatSession, 
    onSelectSession, 
    chatMessages, 
    onSendMessage, 
    onClearHistory, 
    onStartCall 
}) {
    const [text, setText] = useState('');
    const fileInputRef = useRef(null);

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

        // Enforce 1MB file size limit to prevent DB bloat and keep WebSocket packets lightweight
        if (file.size > 1024 * 1024) {
            alert("File size exceeds the 1MB limit. Please upload a smaller file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result;
            // Structure: [FILE:filename:mime]dataUrlBase64
            onSendMessage(`[FILE:${file.name}:${file.type}]${base64Data}`);
        };
        reader.readAsDataURL(file);

        // Reset file input trigger
        e.target.value = '';
    };

    const activeList = appointments.filter(a => a.status !== 'CANCELLED');

    return (
        <section className="screen active" style={{ padding: 0 }}>
            <div className="chat-container">
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <h3 style={{ fontSize: '15px', fontWeight: 700, padding: '15px 20px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                        Active Consultations
                    </h3>
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1 }}>
                        {activeList.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '20px' }}>
                                No active consultation links.
                            </p>
                        ) : (
                            activeList.map(a => {
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

                {/* Main conversation box */}
                <div className="chat-body">
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
                                    if (m.sender === 'System') {
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
                                    let fileData = null;

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
            </div>
        </section>
    );
}
