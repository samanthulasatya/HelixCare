import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Appointments from './components/Appointments';
import Chat from './components/Chat';
import SoapInsurance from './components/SoapInsurance';
import CallingOverlay from './components/CallingOverlay';

const SERVICES = {
    GATEWAY: 'http://16.16.208.91:8080',
    PATIENT: 'http://16.16.208.91:8085',
    DOCTOR: 'http://16.16.208.91:8086',
    APPOINTMENT: 'http://16.16.208.91:8087',
    BILLING: 'http://16.16.208.91:8088'
};

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('helix_token') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('helix_user')) || null);
    const [activeTab, setActiveTab] = useState('tab-auth');

    const [appointments, setAppointments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [selectedChatSession, setSelectedChatSession] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);

    // Call States
    const [callActive, setCallActive] = useState(false);
    const [incomingCallAppointmentId, setIncomingCallAppointmentId] = useState(null);
    const [incomingCallSender, setIncomingCallSender] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [audioMuted, setAudioMuted] = useState(false);
    const [videoMuted, setVideoMuted] = useState(false);
    const [callDuration, setCallDuration] = useState('00:00');

    // Ref pointers
    const stompClientRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const activeChatSubRef = useRef(null);
    const callTimerIntervalRef = useRef(null);
    const acceptingCallFlagRef = useRef(false);

    // References for instant state lookups inside async callbacks
    const userRef = useRef(user);
    const appointmentsRef = useRef(appointments);
    const selectedChatSessionRef = useRef(selectedChatSession);
    const localStreamRef = useRef(localStream);
    const callActiveRef = useRef(callActive);

    useEffect(() => {
        const handleNativeLogout = (e) => {
            const btn = document.getElementById('btnLogout');
            if (btn && e.target instanceof Node && btn.contains(e.target)) {
                console.log("Global native click caught for btnLogout.");
                localStorage.clear();
                window.location.href = "/";
            }
        };
        document.addEventListener('click', handleNativeLogout, true); // Use capture phase
        return () => document.removeEventListener('click', handleNativeLogout, true);
    }, []);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        appointmentsRef.current = appointments;
    }, [appointments]);

    useEffect(() => {
        selectedChatSessionRef.current = selectedChatSession;
    }, [selectedChatSession]);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        callActiveRef.current = callActive;
    }, [callActive]);

    // Bootstrap data and WebSockets connection
    useEffect(() => {
        if (token && user) {
            loadAppointments();
            connectWebSocket();
            setActiveTab('tab-dashboard');
        } else {
            setActiveTab('tab-auth');
            disconnectWebSocket();
        }
    }, [token, user]);

    const loadAppointments = () => {
        let url = `${SERVICES.APPOINTMENT}/api/appointments`;
        if (user.role === 'PATIENT') {
            url = `${SERVICES.APPOINTMENT}/api/appointments/patient/${user.patientId}`;
        } else if (user.role === 'DOCTOR') {
            url = `${SERVICES.APPOINTMENT}/api/appointments/doctor/${user.doctorId}`;
        }

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            setAppointments(data);
        })
        .catch(err => console.error("Error loading appointments:", err));
    };

    const handleAuthSuccess = (newToken, newUser) => {
        localStorage.setItem('helix_token', newToken);
        localStorage.setItem('helix_user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    // WebSocket implementation using @stomp/stompjs Client
    const connectWebSocket = () => {
        if (stompClientRef.current) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(`${SERVICES.GATEWAY}/chat`),
            reconnectDelay: 5000,
            onConnect: (frame) => {
                console.log('STOMP Connected:', frame);
                
                // Subscribe to background notifications
                const targetUser = userRef.current;
                if (targetUser.role === 'PATIENT') {
                    client.subscribe(`/topic/notifications/patient/${targetUser.patientId}`, (msg) => {
                        handlePushNotification(JSON.parse(msg.body));
                    });
                } else if (targetUser.role === 'DOCTOR') {
                    client.subscribe(`/topic/notifications/doctor/${targetUser.doctorId}`, (msg) => {
                        handlePushNotification(JSON.parse(msg.body));
                    });
                }
            },
            onStompError: (frame) => {
                console.error('Broker error:', frame.headers['message']);
            }
        });

        client.activate();
        stompClientRef.current = client;
    };

    const disconnectWebSocket = () => {
        if (stompClientRef.current) {
            stompClientRef.current.deactivate();
            stompClientRef.current = null;
        }
    };

    const handlePushNotification = (notif) => {
        if (notif.type === 'VIDEO_CALL') {
            if (callActiveRef.current) {
                // Autodecline busys
                declineCallById(notif.appointmentId);
                return;
            }
            setIncomingCallAppointmentId(notif.appointmentId);
            setIncomingCallSender(notif.sender);
        } else if (notif.type === 'VIDEO_CALL_DECLINE') {
            alert(notif.message);
            hangUpCall(false);
        } else if (notif.type === 'VIDEO_CALL_CANCEL') {
            setIncomingCallAppointmentId(null);
            setIncomingCallSender(null);
            alert("Incoming call cancelled by caller.");
        } else {
            setNotifications(prev => [notif, ...prev]);
            alert(notif.message);
        }
    };

    const declineCallById = (appId) => {
        const appointment = appointmentsRef.current.find(a => a.id === appId);
        if (appointment && stompClientRef.current) {
            let targetDest = appointment.user.role === 'PATIENT' ? 
                `/topic/notifications/doctor/${appointment.doctor.id}` : 
                `/topic/notifications/patient/${appointment.patient.id}`;
            
            stompClientRef.current.publish({
                destination: targetDest,
                body: JSON.stringify({
                    type: 'VIDEO_CALL_DECLINE',
                    message: `${userRef.current.username} is busy in another session.`,
                    appointmentId: appId
                })
            });
        }
    };

    // Chat room select session and subscription
    const handleSelectChatSession = (appointment) => {
        setSelectedChatSession(appointment);
        setChatMessages([]);

        // Load chat history
        fetch(`${SERVICES.APPOINTMENT}/api/appointments/${appointment.id}/chat`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const formatted = data.map(m => {
                let timeStr = m.timestamp;
                try {
                    timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch(e) {}
                return { ...m, timestamp: timeStr };
            });
            setChatMessages(formatted);
        })
        .catch(err => console.error("Error loading chat history:", err));

        // Subscribe to Stomp room topic
        if (activeChatSubRef.current) {
            activeChatSubRef.current.unsubscribe();
        }

        if (stompClientRef.current) {
            const sub = stompClientRef.current.subscribe(`/topic/chat/${appointment.id}`, (msg) => {
                const chatMsg = JSON.parse(msg.body);
                if (chatMsg.content.startsWith('__WEBRTC__:')) {
                    handleWebRtcSignaling(chatMsg);
                } else {
                    let rtTimeStr = chatMsg.timestamp;
                    try {
                        rtTimeStr = new Date(chatMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch(e) {}
                    setChatMessages(prev => [...prev, { ...chatMsg, timestamp: rtTimeStr }]);
                }
            });
            activeChatSubRef.current = sub;
        }

        // If B switched tab because they accepted a call
        if (acceptingCallFlagRef.current) {
            acceptingCallFlagRef.current = false;
            initializeLocalVideoAndJoinCall(appointment.id);
        }
    };

    const sendSystemChatMessage = (appointmentId, text) => {
        if (!stompClientRef.current) return;
        const payload = {
            appointmentId: appointmentId,
            sender: "System",
            content: text
        };
        stompClientRef.current.publish({
            destination: `/app/chat/${appointmentId}`,
            body: JSON.stringify(payload)
        });
    };

    const sendChatMessage = (text) => {
        if (!stompClientRef.current || !selectedChatSession) return;
        const payload = {
            appointmentId: selectedChatSession.id,
            sender: user.username,
            content: text
        };
        stompClientRef.current.publish({
            destination: `/app/chat/${selectedChatSession.id}`,
            body: JSON.stringify(payload)
        });
    };

    const handleClearHistory = () => {
        if (!selectedChatSession) return;
        if (confirm("Are you sure you want to permanently clear the conversation history for this consultation? This action cannot be undone.")) {
            fetch(`${SERVICES.APPOINTMENT}/api/appointments/${selectedChatSession.id}/chat`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(() => {
                setChatMessages([]);
                alert("Chat history successfully cleared.");
            })
            .catch(err => alert(err.message));
        }
    };

    // ==================================================
    // WebRTC VIDEO CALL SIGNALLING & PEER CONNECTIONS
    // ==================================================
    const sendRtcSignal = (type, data) => {
        if (!selectedChatSessionRef.current || !stompClientRef.current) return;
        const payload = {
            appointmentId: selectedChatSessionRef.current.id,
            sender: userRef.current.username,
            content: `__WEBRTC__:${JSON.stringify({ type, ...data })}`
        };
        stompClientRef.current.publish({
            destination: `/app/chat/${selectedChatSessionRef.current.id}`,
            body: JSON.stringify(payload)
        });
    };

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendRtcSignal('candidate', { candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        peerConnectionRef.current = pc;
    };

    const handleWebRtcSignaling = (msg) => {
        if (msg.sender === userRef.current.username) return;

        try {
            const data = JSON.parse(msg.content.substring(11));
            
            switch (data.type) {
                case 'join':
                    if (callActiveRef.current) {
                        createPeerConnection();
                        peerConnectionRef.current.createOffer()
                        .then(offer => {
                            return peerConnectionRef.current.setLocalDescription(offer).then(() => offer);
                        })
                        .then(offer => {
                            sendRtcSignal('offer', { sdp: offer });
                            startCallTimer();
                            console.log("Offer dispatched to peer.");
                        })
                        .catch(e => console.error("Error generating offer:", e));
                    }
                    break;

                case 'offer':
                    if (peerConnectionRef.current) {
                        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
                        .then(() => {
                            return peerConnectionRef.current.createAnswer();
                        })
                        .then(answer => {
                            return peerConnectionRef.current.setLocalDescription(answer).then(() => answer);
                        })
                        .then(answer => {
                            sendRtcSignal('answer', { sdp: answer });
                        })
                        .catch(e => console.error("Error answering offer:", e));
                    }
                    break;

                case 'answer':
                    if (peerConnectionRef.current) {
                        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
                        .then(() => {
                            sendSystemChatMessage(selectedChatSessionRef.current.id, "Video consultation session started.");
                        })
                        .catch(e => console.error("Error setting remote description answer:", e));
                    }
                    break;

                case 'candidate':
                    if (peerConnectionRef.current && data.candidate) {
                        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(e => console.error("Error adding remote candidate:", e));
                    }
                    break;

                case 'decline':
                    alert("Video call declined by peer.");
                    hangUpCall(false);
                    break;

                case 'hangup':
                    alert("Video session closed by peer.");
                    hangUpCall(false);
                    break;
            }
        } catch (e) {
            console.error("Failed to parse WebRTC signal:", e);
        }
    };

    const startVideoCall = () => {
        if (!selectedChatSession) {
            alert("Select a conversation from the sidebar first.");
            return;
        }

        const appointment = appointments.find(a => a.id === selectedChatSession.id);
        if (!appointment) return;

        let targetDest = user.role === 'PATIENT' ? 
            `/topic/notifications/doctor/${appointment.doctor.id}` : 
            `/topic/notifications/patient/${appointment.patient.id}`;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            setLocalStream(stream);
            setCallActive(true);
            
            // Dispatch notification
            stompClientRef.current.publish({
                destination: targetDest,
                body: JSON.stringify({
                    type: 'VIDEO_CALL',
                    message: `${user.username} is calling you for video consultation.`,
                    appointmentId: appointment.id,
                    sender: user.username
                })
            });
            console.log("Calling peer via background channel...");
        })
        .catch(err => {
            alert("Webcam/Mic access denied. Enable permissions in your browser.");
            console.error(err);
        });
    };

    const acceptIncomingCall = () => {
        const appId = incomingCallAppointmentId;
        setIncomingCallAppointmentId(null);
        setIncomingCallSender(null);

        acceptingCallFlagRef.current = true;
        
        // Find appointment
        const appointment = appointments.find(a => a.id === appId);
        if (appointment) {
            setActiveTab('tab-chat');
            handleSelectChatSession(appointment);
        }
    };

    const initializeLocalVideoAndJoinCall = (appId) => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            setLocalStream(stream);
            setCallActive(true);
            
            // Generate peer connection immediately
            createPeerConnection();
            
            // Dispatch join to websocket
            const payload = {
                appointmentId: appId,
                sender: userRef.current.username,
                content: `__WEBRTC__:${JSON.stringify({ type: 'join' })}`
            };
            stompClientRef.current.publish({
                destination: `/app/chat/${appId}`,
                body: JSON.stringify(payload)
            });
            startCallTimer();
        })
        .catch(err => {
            alert("Call access failed. Camera/mic is required.");
            console.error(err);
            declineIncomingCall(appId);
        });
    };

    const declineIncomingCall = () => {
        const appId = incomingCallAppointmentId;
        setIncomingCallAppointmentId(null);
        setIncomingCallSender(null);

        const appointment = appointments.find(a => a.id === appId);
        if (appointment && stompClientRef.current) {
            let targetDest = user.role === 'PATIENT' ? 
                `/topic/notifications/doctor/${appointment.doctor.id}` : 
                `/topic/notifications/patient/${appointment.patient.id}`;
            
            stompClientRef.current.publish({
                destination: targetDest,
                body: JSON.stringify({
                    type: 'VIDEO_CALL_DECLINE',
                    message: `${user.username} declined your call invite.`,
                    appointmentId: appId
                })
            });
        }
    };

    const hangUpCall = (notifyPeer) => {
        if (notifyPeer && callActiveRef.current) {
            if (peerConnectionRef.current) {
                const duration = document.getElementById('callDuration') ? document.getElementById('callDuration').innerText : '00:00';
                sendSystemChatMessage(selectedChatSessionRef.current.id, `Video consultation session ended. Duration: ${duration}`);
                sendRtcSignal('hangup', {});
            } else if (selectedChatSessionRef.current) {
                const appointment = appointmentsRef.current.find(a => a.id === selectedChatSessionRef.current.id);
                if (appointment && stompClientRef.current) {
                    let targetDest = userRef.current.role === 'PATIENT' ? 
                        `/topic/notifications/doctor/${appointment.doctor.id}` : 
                        `/topic/notifications/patient/${appointment.patient.id}`;
                    
                    stompClientRef.current.publish({
                        destination: targetDest,
                        body: JSON.stringify({
                            type: 'VIDEO_CALL_CANCEL',
                            message: `Call cancelled by ${userRef.current.username}.`,
                            appointmentId: appointment.id
                        })
                    });
                    sendSystemChatMessage(appointment.id, "Video call invitation cancelled by caller.");
                }
            }
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        stopCallTimer();
        setCallActive(false);
        setRemoteStream(null);
        setAudioMuted(false);
        setVideoMuted(false);
        setCallDuration('00:00');
    };

    const toggleAudio = () => {
        if (!localStream) return;
        const target = !audioMuted;
        localStream.getAudioTracks().forEach(track => track.enabled = !target);
        setAudioMuted(target);
    };

    const toggleVideo = () => {
        if (!localStream) return;
        const target = !videoMuted;
        localStream.getVideoTracks().forEach(track => track.enabled = !target);
        setVideoMuted(target);
    };

    const startCallTimer = () => {
        let seconds = 0;
        setCallDuration('00:00');
        stopCallTimer();

        callTimerIntervalRef.current = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            setCallDuration(`${mins}:${secs}`);
        }, 1000);
    };

    const stopCallTimer = () => {
        if (callTimerIntervalRef.current) {
            clearInterval(callTimerIntervalRef.current);
            callTimerIntervalRef.current = null;
        }
    };
    return (
        <div 
            className={token ? "app-container" : ""} 
            style={token ? { 
                minHeight: '100vh', 
                background: 'var(--color-bg)' 
            } : { 
                minHeight: '100vh', 
                width: '100%',
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--color-bg)' 
            }}
        >
            {/* Sidebar Left Navigation */}
            {token && user && (
                <div className="sidebar">
                    <div className="logo">
                        <i className="fa-solid fa-square-h logo-icon"></i>
                        <div className="logo-text">Helix<span>Care</span></div>
                    </div>

                    <div className="user-badge">
                        <div className="avatar"><i className="fa-solid fa-circle-user"></i></div>
                        <div className="user-info">
                            <h4 id="userBadgeName">{user.username}</h4>
                            <p id="userBadgeRole" style={{ margin: 0 }}>{user.role}</p>
                        </div>
                    </div>

                    <nav className="nav-menu">
                        <a 
                            className={`nav-item ${activeTab === 'tab-dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tab-dashboard')}
                        >
                            <span style={{ marginRight: '12px', fontSize: '16px' }}>📊</span> Dashboard
                        </a>
                        <a 
                            className={`nav-item ${activeTab === 'tab-appointments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tab-appointments')}
                        >
                            <span style={{ marginRight: '12px', fontSize: '16px' }}>🩺</span> Consultations
                        </a>
                        <a 
                            className={`nav-item ${activeTab === 'tab-chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tab-chat')}
                        >
                            <span style={{ marginRight: '12px', fontSize: '16px' }}>💬</span> Virtual Chat Room
                        </a>
                        <a 
                            className={`nav-item ${activeTab === 'tab-soap' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tab-soap')}
                        >
                            <span style={{ marginRight: '12px', fontSize: '16px' }}>🛡️</span> SOAP Insurance
                        </a>
                    </nav>

                    <div className="sidebar-footer">
                        <button 
                            className="btn btn-secondary btn-block" 
                            id="btnLogout" 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                console.log("Logout triggered"); 
                                localStorage.clear(); 
                                window.location.href = "/"; 
                            }}
                            style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto', cursor: 'pointer' }}
                        >
                            <span style={{ marginRight: '10px', fontSize: '16px' }}>🚪</span> Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Main view content body */}
            <main className="main-content" style={{ padding: token ? '40px' : '0px', overflowY: 'auto' }}>
                {!token ? (
                    <Auth onAuthSuccess={handleAuthSuccess} />
                ) : (
                    <>
                        {activeTab === 'tab-dashboard' && <Dashboard user={user} />}
                        {activeTab === 'tab-appointments' && (
                            <Appointments 
                                user={user} 
                                token={token} 
                                appointments={appointments} 
                                reloadAppointments={loadAppointments} 
                            />
                        )}
                        {activeTab === 'tab-chat' && (
                            <Chat 
                                user={user} 
                                appointments={appointments} 
                                selectedChatSession={selectedChatSession}
                                onSelectSession={handleSelectChatSession}
                                chatMessages={chatMessages}
                                onSendMessage={sendChatMessage}
                                onClearHistory={handleClearHistory}
                                onStartCall={startVideoCall}
                            />
                        )}
                        {activeTab === 'tab-soap' && <SoapInsurance />}
                    </>
                )}
            </main>

            {/* Background callringing and active streams overlays */}
            <CallingOverlay 
                user={user}
                callActive={callActive}
                incomingCallAppointmentId={incomingCallAppointmentId}
                incomingCallSender={incomingCallSender}
                localStream={localStream}
                remoteStream={remoteStream}
                audioMuted={audioMuted}
                videoMuted={videoMuted}
                callDuration={callDuration}
                onAcceptCall={acceptIncomingCall}
                onDeclineCall={declineIncomingCall}
                onHangUp={hangUpCall}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
            />
        </div>
    );
}
