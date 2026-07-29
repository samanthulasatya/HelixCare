import React, { useState, useEffect } from 'react';

const SERVICES = {
    GATEWAY: 'https://helixcare.duckdns.org'
};

export default function Auth({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Registration fields
    const [role, setRole] = useState('PATIENT');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('Male');
    const [medHistory, setMedHistory] = useState('');
    const [specialization, setSpecialization] = useState('Cardiology');
    const [customSpecialization, setCustomSpecialization] = useState('');

    // OTP 2FA States
    const [otpRequired, setOtpRequired] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [tempUsername, setTempUsername] = useState('');
    const [devOtpHint, setDevOtpHint] = useState('');

    // Registration OTP States
    const [regOtpRequired, setRegOtpRequired] = useState(false);
    const [regOtpCode, setRegOtpCode] = useState('');
    const [regOtpHint, setRegOtpHint] = useState('');

    // Countdown resend timer cooldown state
    const [resendTimer, setResendTimer] = useState(0);

    // Global loading state for SMTP email delay feedback
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let interval = null;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        fetch(`${SERVICES.GATEWAY}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => {
            if (!res.ok) throw new Error("Invalid username or password");
            return res.json();
        })
        .then(data => {
            setLoading(false);
            if (data.otpRequired) {
                setOtpRequired(true);
                setResendTimer(30);
                setTempUsername(data.username);
                setDevOtpHint(data.devOtp);
                console.log("[HelixCare OTP Helper] Verification Code is: " + data.devOtp);
            } else {
                onAuthSuccess(data.token, {
                    id: data.userId,
                    username: data.username,
                    role: data.role,
                    patientId: data.patientId,
                    doctorId: data.doctorId
                });
            }
        })
        .catch(err => {
            setLoading(false);
            alert(err.message);
        });
    };

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        setLoading(true);
        fetch(`${SERVICES.GATEWAY}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: tempUsername, otp: otpCode })
        })
        .then(res => {
            if (!res.ok) return res.text().then(text => { throw new Error(text) });
            return res.json();
        })
        .then(data => {
            setLoading(false);
            onAuthSuccess(data.token, {
                id: data.userId,
                username: data.username,
                role: data.role,
                patientId: data.patientId,
                doctorId: data.doctorId
            });
        })
        .catch(err => {
            setLoading(false);
            alert(err.message);
        });
    };

    const handleRegister = (e) => {
        e.preventDefault();
        setLoading(true);
        
        if (!regOtpRequired) {
            // Step 1: Request registration verification code via email
            fetch(`${SERVICES.GATEWAY}/api/auth/register-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            .then(res => {
                if (!res.ok) return res.text().then(text => { throw new Error(text) });
                return res.json();
            })
            .then(data => {
                setLoading(false);
                setRegOtpRequired(true);
                setResendTimer(30);
                setRegOtpHint(data.devOtp);
                console.log("[HelixCare Register OTP Helper] Code is: " + data.devOtp);
                alert("A verification code (OTP) has been sent to your email address: " + email);
            })
            .catch(err => {
                setLoading(false);
                alert(err.message);
            });
        } else {
            // Step 2: Verify code and register account details
            const payload = {
                username,
                password,
                role,
                firstName,
                lastName,
                email,
                phone,
                dateOfBirth: role === 'PATIENT' ? dob : null,
                gender: role === 'PATIENT' ? gender : null,
                medicalHistory: role === 'PATIENT' ? medHistory : null,
                specialization: role === 'DOCTOR' ? (specialization === 'Others' ? customSpecialization : specialization) : null,
                otp: regOtpCode
            };

            fetch(`${SERVICES.GATEWAY}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) return res.text().then(text => { throw new Error(text) });
                return res.text();
            })
            .then(() => {
                setLoading(false);
                alert("Email verified and registration completed successfully! You can now log in.");
                setRegOtpRequired(false);
                setRegOtpCode('');
                setIsLogin(true);
            })
            .catch(err => {
                setLoading(false);
                alert(err.message);
            });
        }
    };

    const handleResendRegisterOtp = (e) => {
        e.preventDefault();
        setLoading(true);
        fetch(`${SERVICES.GATEWAY}/api/auth/register-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => {
            if (!res.ok) return res.text().then(text => { throw new Error(text) });
            return res.json();
        })
        .then(data => {
            setLoading(false);
            setResendTimer(30);
            setRegOtpHint(data.devOtp);
            console.log("[HelixCare Register OTP Helper] Resent Code is: " + data.devOtp);
            alert("A new verification code (OTP) has been sent to your email address: " + email);
        })
        .catch(err => {
            setLoading(false);
            alert(err.message);
        });
    };

    return (
        <section style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', padding: '40px 20px', boxSizing: 'border-box' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: isLogin ? '400px' : '650px', padding: '30px', margin: 'auto' }}>
                {otpRequired ? (
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                            <i className="fa-solid fa-key" style={{ color: 'var(--color-primary-light)', marginRight: '8px' }}></i>
                            2FA Verification
                        </h1>
                        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '5px' }}>
                            Please verify your session to proceed
                        </p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                            <i className="fa-solid fa-square-h" style={{ color: 'var(--color-primary-light)', marginRight: '8px' }}></i>
                            HelixCare Portal
                        </h1>
                        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '5px' }}>
                            {isLogin ? 'Sign in to access your telemedicine account' : 'Register a new patient or doctor account'}
                        </p>
                    </div>
                )}

                {!otpRequired && (
                    <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button 
                            className={`btn ${isLogin ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ flex: 1 }}
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button 
                            className={`btn ${!isLogin ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ flex: 1 }}
                            onClick={() => setIsLogin(false)}
                        >
                            Register
                        </button>
                    </div>
                )}

                {otpRequired ? (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                            <label>One-Time Verification Code</label>
                            <input 
                                type="text" 
                                required 
                                maxLength="6"
                                placeholder="Enter 6-digit OTP code"
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value)}
                                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '8px', fontWeight: 700 }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '10px' }} disabled={loading}>
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                    Verifying...
                                </>
                            ) : "Verify Code"}
                        </button>
                        <div style={{ marginTop: '15px', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <a href="#" style={{ color: 'var(--color-text-muted)' }} onClick={(e) => { e.preventDefault(); setOtpRequired(false); setOtpCode(''); }}>
                                Back to Sign In
                            </a>
                            {resendTimer > 0 ? (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                    Resend code in {resendTimer}s
                                </span>
                            ) : (
                                <a href="#" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }} onClick={(e) => { e.preventDefault(); handleLogin(e); }}>
                                    Resend OTP
                                </a>
                            )}
                        </div>
                    </form>
                ) : isLogin ? (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Username</label>
                            <input 
                                type="text" 
                                required 
                                value={username} 
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter your username" 
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" 
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '10px' }} disabled={loading}>
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                    Sending OTP...
                                </>
                            ) : "Sign In"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        {regOtpRequired ? (
                            <div className="form-group" style={{ textAlign: 'left' }}>
                                <label>Verification Code sent to {email}</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength="6"
                                    placeholder="Enter 6-digit verification code"
                                    value={regOtpCode}
                                    onChange={e => setRegOtpCode(e.target.value)}
                                    style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '8px', fontWeight: 700 }}
                                />
                                <div style={{ marginTop: '15px', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <a href="#" style={{ color: 'var(--color-text-muted)' }} onClick={(e) => { e.preventDefault(); setRegOtpRequired(false); setRegOtpCode(''); }}>
                                        Back to details edit
                                    </a>
                                    {resendTimer > 0 ? (
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                            Resend code in {resendTimer}s
                                        </span>
                                    ) : (
                                        <a href="#" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }} onClick={handleResendRegisterOtp}>
                                            Resend OTP
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Username</label>
                                    <input type="text" required value={username} onChange={e => setUsername(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Account Role</label>
                                    <select value={role} onChange={e => setRole(e.target.value)}>
                                        <option value="PATIENT">Patient Account</option>
                                        <option value="DOCTOR">Doctor Account</option>
                                    </select>
                                </div>

                                {role === 'PATIENT' ? (
                                    <>
                                        <div className="form-group">
                                            <label>Date of Birth</label>
                                            <input type="date" required value={dob} onChange={e => setDob(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Gender</label>
                                            <select value={gender} onChange={e => setGender(e.target.value)}>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label>Medical History / Chronic Conditions</label>
                                            <textarea 
                                                rows="2" 
                                                value={medHistory} 
                                                onChange={e => setMedHistory(e.target.value)}
                                                placeholder="Specify any drug allergies, conditions, or write None"
                                            ></textarea>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Medical Specialization</label>
                                            <select value={specialization} onChange={e => setSpecialization(e.target.value)}>
                                                <option value="Cardiology">Cardiology</option>
                                                <option value="General Medicine">General Medicine</option>
                                                <option value="Pediatrics">Pediatrics</option>
                                                <option value="Neurology">Neurology</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                        {specialization === 'Others' && (
                                            <div className="form-group">
                                                <label>Enter Custom Specialization</label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    placeholder="e.g. Dentistry, Dermatology..." 
                                                    value={customSpecialization} 
                                                    onChange={e => setCustomSpecialization(e.target.value)} 
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '20px' }} disabled={loading}>
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                    {regOtpRequired ? "Verifying..." : "Sending OTP..."}
                                </>
                            ) : (
                                regOtpRequired ? "Verify & Register" : "Send Verification OTP"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}
