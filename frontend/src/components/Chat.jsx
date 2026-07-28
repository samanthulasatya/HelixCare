import React, { useState } from 'react';

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

    const handleSend = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setText('');
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
                                    `Dr. ${a.doctor.lastName}` : 
                                    `${a.patient.firstName} ${a.patient.lastName}`;
                                const active = selectedChatSession && selectedChatSession.id === a.id;
                                
                                return (
                                    <div 
                                        key={a.id}
                                        className={`chat-session-item ${active ? 'active' : ''}`}
                                        onClick={() => onSelectSession(a)}
                                    >
                                        <div className="avatar">
                                            {user.role === 'PATIENT' ? <i className="fa-solid fa-user-md"></i> : <i className="fa-solid fa-user"></i>}
                                        </div>
                                        <div className="session-info">
                                            <h4>{name}</h4>
                                            <span>Session #{a.id} ({a.status})</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Messages Panel */}
                <div className="chat-messages-panel">
                    {selectedChatSession ? (
                        <>
                            <div className="chat-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="chat-header-avatar">
                                        {user.role === 'PATIENT' ? <i className="fa-solid fa-user-md"></i> : <i className="fa-solid fa-user"></i>}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600 }}>
                                            {user.role === 'PATIENT' ? 
                                                `Dr. ${selectedChatSession.doctor.firstName} ${selectedChatSession.doctor.lastName} (${selectedChatSession.doctor.specialization})` : 
                                                `${selectedChatSession.patient.firstName} ${selectedChatSession.patient.lastName}`}
                                        </h4>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Secure Medical Link</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-mini btn-success" onClick={onStartCall} title="Launch WebRTC Video Consultation">
                                        <i className="fa-solid fa-video"></i> Video Call
                                    </button>
                                    <button className="btn btn-mini btn-danger" onClick={onClearHistory} title="Clear Chat History logs">
                                        <i className="fa-solid fa-trash"></i> Clear History
                                    </button>
                                </div>
                            </div>

                            <div className="chat-messages" style={{ overflowY: 'auto' }}>
                                {chatMessages.map((m, idx) => {
                                    if (m.sender === 'System') {
                                        return (
                                            <div 
                                                key={idx} 
                                                className="msg-bubble received" 
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
                                    return (
                                        <div key={idx} className={`msg-bubble ${isMe ? 'sent' : 'received'}`}>
                                            <strong style={{ fontSize: '10px', display: 'block', opacity: 0.8, marginBottom: '2px' }}>
                                                {m.sender}
                                            </strong>
                                            {m.content}
                                            <span className="time">{m.timestamp}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleSend} className="chat-input-row">
                                <input 
                                    type="text" 
                                    placeholder="Enter your message..." 
                                    value={text} 
                                    onChange={e => setText(e.target.value)} 
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
