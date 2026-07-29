import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, onNavigate }) {
    const [missedCalls, setMissedCalls] = useState([]);

    const loadMissedCalls = () => {
        const list = JSON.parse(localStorage.getItem('missed_calls') || '[]');
        setMissedCalls(list);
    };

    useEffect(() => {
        loadMissedCalls();
        // Register window listener for reactive updates
        window.addEventListener('missed_calls_updated', loadMissedCalls);
        return () => window.removeEventListener('missed_calls_updated', loadMissedCalls);
    }, []);

    const clearMissedCalls = () => {
        localStorage.removeItem('missed_calls');
        setMissedCalls([]);
    };

    return (
        <section className="screen active">
            {/* Welcome banner */}
            <div className="glass-card" style={{ padding: '35px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: 'white'
                    }}>
                        <i className="fa-solid fa-user-shield"></i>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Welcome back, {user.username}!</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>
                            Access your medical files, book virtual consults, and chat live with specialist providers.
                        </p>
                    </div>
                </div>
            </div>

            {/* Missed Calls Panel */}
            {missedCalls.length > 0 && (
                <div className="glass-card" style={{ 
                    padding: '25px', 
                    marginBottom: '30px', 
                    border: '1px solid rgba(239, 68, 68, 0.4)', 
                    background: 'rgba(239, 68, 68, 0.08)' 
                }}>
                    <h4 style={{ color: '#fca5a5', margin: '0 0 12px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <i className="fa-solid fa-phone-slash" style={{ color: 'var(--color-danger)' }}></i> Missed Teleconsultation Calls
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-text)', fontSize: '13px', lineHeight: 1.6 }}>
                        {missedCalls.map((call, idx) => (
                            <li key={idx} style={{ marginBottom: '8px' }}>
                                You missed a video consultation call from <strong>{call.sender}</strong> on <strong>{call.timestamp}</strong>.
                            </li>
                        ))}
                    </ul>
                    <button 
                        className="btn btn-secondary" 
                        onClick={clearMissedCalls} 
                        style={{ marginTop: '15px', padding: '6px 16px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
                    >
                        Dismiss Notifications
                    </button>
                </div>
            )}

            <h3 className="section-title">HelixCare Services Directory</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', marginBottom: '20px' }}>
                Select any of the services below to launch and explore their features:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                {/* Virtual Appointments Card */}
                <div 
                    className="glass-card card-hover" 
                    onClick={() => onNavigate('tab-appointments')}
                    style={{ padding: '25px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >
                    <h4 style={{ color: 'var(--color-primary-light)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-laptop-medical"></i> Virtual Appointments
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                        Schedule live telemedicine consultations with board-certified doctors. Integrates real-time conflicts locking check.
                    </p>
                    <div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        Book Appointment <i className="fa-solid fa-arrow-right"></i>
                    </div>
                </div>

                {/* Live Chat & WebRTC Calling Card */}
                <div 
                    className="glass-card card-hover" 
                    onClick={() => onNavigate('tab-chat')}
                    style={{ padding: '25px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >
                    <h4 style={{ color: 'var(--color-primary-light)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-comment-dots"></i> Live Chat & WebRTC Calling
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                        Exchange text notices, review prescription history, and launch peer-to-peer WebRTC video stream sessions inside your chat room.
                    </p>
                    <div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        Open Chat Rooms <i className="fa-solid fa-arrow-right"></i>
                    </div>
                </div>

                {/* SOAP Insurance Claims Card */}
                <div 
                    className="glass-card card-hover" 
                    onClick={() => onNavigate('tab-soap')}
                    style={{ padding: '25px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >
                    <h4 style={{ color: 'var(--color-primary-light)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-file-shield"></i> SOAP Insurance Claims
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                        Simulate legacy SOAP XML claims verification to check deductibles, coinsurances, and out-of-pocket billing totals instantly.
                    </p>
                    <div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        Validate Claims <i className="fa-solid fa-arrow-right"></i>
                    </div>
                </div>
            </div>
        </section>
    );
}
