import React, { useEffect, useRef } from 'react';

export default function CallingOverlay({
    user,
    callActive,
    incomingCallAppointmentId,
    incomingCallSender,
    localStream,
    remoteStream,
    audioMuted,
    videoMuted,
    callDuration,
    onAcceptCall,
    onDeclineCall,
    onHangUp,
    onToggleAudio,
    onToggleVideo
}) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callActive]);

    useEffect(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callActive]);

    return (
        <>
            {/* Incoming Call Ringing Dialog */}
            {incomingCallAppointmentId && (
                <div className="modal-overlay active">
                    <div className="modal glass-card" style={{ padding: '30px', maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px auto',
                            fontSize: '32px',
                            color: 'var(--color-success)',
                            animation: 'pulse 1.5s infinite'
                        }}>
                            <i className="fa-solid fa-phone-volume"></i>
                        </div>
                        <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>Incoming Video Call</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '25px' }}>
                            Connection requested by <strong>{incomingCallSender}</strong>
                        </p>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={onDeclineCall}>
                                <i className="fa-solid fa-phone-slash"></i> Decline
                            </button>
                            <button className="btn btn-success" style={{ flex: 1 }} onClick={onAcceptCall}>
                                <i className="fa-solid fa-phone"></i> Answer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Video Stream Container */}
            {/* Active Video Stream Container */}
            {callActive && (
                <div className="video-overlay" id="videoOverlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(10, 8, 20, 0.95)', backdropFilter: 'blur(12px)', zIndex: 9999 }}>
                    <div className="video-container glass-card" style={{ display: 'flex', flexDirection: 'column', width: '90%', maxWidth: '960px', height: '85%', maxHeight: '680px', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(13, 10, 28, 0.95)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)' }}>
                        <div className="video-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                                Live Teleconsultation Session
                            </h3>
                            <div className="call-duration" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
                                {callDuration || "00:00"}
                            </div>
                        </div>

                        <div className="video-streams" style={{ flexGrow: 1, position: 'relative', background: '#06040d', borderRadius: '12px', overflow: 'hidden', marginBottom: '15px', border: '1px solid var(--border-color)' }}>
                            {/* Remote Participant camera stream */}
                            <video 
                                ref={remoteVideoRef} 
                                id="remoteVideo"
                                autoPlay 
                                playsInline 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div className="video-label" style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, zIndex: 5 }}>
                                Provider Feed (Remote)
                            </div>

                            {/* Local Self floating camera stream */}
                            <video 
                                ref={localVideoRef} 
                                id="localVideo"
                                autoPlay 
                                playsInline 
                                muted 
                                style={{ position: 'absolute', bottom: '20px', right: '20px', width: '200px', height: '150px', border: '2.5px solid var(--color-primary-light)', borderRadius: '10px', objectFit: 'cover', background: '#110e24', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }} 
                            />
                            <div className="video-label" style={{ position: 'absolute', bottom: '30px', right: '235px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, zIndex: 15 }}>
                                You
                            </div>
                        </div>

                        <div className="video-controls" style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '10px 0' }}>
                            <button 
                                className={`btn-circle ${audioMuted ? 'muted' : ''}`} 
                                onClick={onToggleAudio}
                                style={{ width: '50px', height: '50px', borderRadius: '50%', background: audioMuted ? 'var(--color-warning)' : 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}
                                title={audioMuted ? "Unmute Mic" : "Mute Mic"}
                            >
                                {audioMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5.79"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                                )}
                            </button>
                            <button 
                                className="btn-circle btn-danger" 
                                onClick={() => onHangUp(true)}
                                style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--color-danger)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}
                                title="End Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)' }}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6.24-6.24A19.79 19.79 0 0 1 2 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 2.68 3.4Z"/></svg>
                            </button>
                            <button 
                                className={`btn-circle ${videoMuted ? 'muted' : ''}`} 
                                onClick={onToggleVideo}
                                style={{ width: '50px', height: '50px', borderRadius: '50%', background: videoMuted ? 'var(--color-warning)' : 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}
                                title={videoMuted ? "Start Video" : "Stop Video"}
                            >
                                {videoMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="m22 8-6 4 6 4V8Z"/><path d="M2 17a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5"/><path d="M15 9.6a2 2 0 0 0-.27-1A2 2 0 0 0 13 7H7.4"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
