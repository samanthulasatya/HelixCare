import React from 'react';

export default function Dashboard({ user, onLogout }) {
    return (
        <section className="screen active">
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

            <h3 className="section-title">HelixCare Services Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                <div className="glass-card card-hover" style={{ padding: '25px' }}>
                    <h4 style={{ color: 'var(--color-primary-light)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-laptop-medical"></i> Virtual Appointments
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                        Schedule live telemedicine consultations with board-certified doctors. Integrates real-time conflicts locking check.
                    </p>
                </div>

                <div className="glass-card card-hover" style={{ padding: '25px' }}>
                    <h4 style={{ color: 'var(--color-primary-light)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-comment-dots"></i> Live Chat & WebRTC Calling
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                        Exchange text notices, review prescription history, and launch peer-to-peer WebRTC video stream sessions inside your chat room.
                    </p>
                </div>

                <div className="glass-card card-hover" style={{ padding: '25px' }}>
                    <h4 style={{ color: 'var(--color-primary-light)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-file-shield"></i> SOAP Insurance Claims
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                        Simulate legacy SOAP XML claims verification to check deductibles, coinsurances, and out-of-pocket billing totals instantly.
                    </p>
                </div>
            </div>
        </section>
    );
}
