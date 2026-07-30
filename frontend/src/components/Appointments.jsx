import React, { useState, useEffect } from 'react';

const SERVICES = {
    PATIENT: 'https://helixcare.duckdns.org',
    DOCTOR: 'https://helixcare.duckdns.org',
    APPOINTMENT: 'https://helixcare.duckdns.org'
};

const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
            <mark key={i} style={{ background: 'rgba(157, 78, 221, 0.4)', color: 'inherit', padding: '0 2px', borderRadius: '3px', fontWeight: 'bold' }}>{part}</mark> : 
            part
    );
};

export default function Appointments({ user, token, appointments, reloadAppointments, searchQuery: globalSearchQuery }) {
    const [doctors, setDoctors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [specFilter, setSpecFilter] = useState('');
    
    // Booking modal state
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [bookDate, setBookDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    // Complete Consultation modal state
    const [selectedAppointmentForComplete, setSelectedAppointmentForComplete] = useState(null);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [symptoms, setSymptoms] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [treatmentPlan, setTreatmentPlan] = useState('');
    const [notes, setNotes] = useState('');
    
    // Prescription
    const [medication, setMedication] = useState('');
    const [dosage, setDosage] = useState('');
    const [instructions, setInstructions] = useState('');

    useEffect(() => {
        loadDoctors();
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setBookDate(tomorrow.toISOString().split('T')[0]);
    }, [searchQuery, specFilter, globalSearchQuery]);

    const loadDoctors = () => {
        const activeSearch = searchQuery || globalSearchQuery || specFilter;
        const queryParam = activeSearch ? `?query=${activeSearch}` : '';
        fetch(`${SERVICES.DOCTOR}/api/doctors${queryParam}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setDoctors(data))
        .catch(err => console.error("Error loading doctors:", err));
    };

    const handleCancel = (appId) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;
        fetch(`${SERVICES.APPOINTMENT}/api/appointments/${appId}/cancel`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("Cancellation failed.");
            return res.json();
        })
        .then(() => {
            alert("Appointment cancelled successfully!");
            reloadAppointments();
        })
        .catch(err => alert(err.message));
    };

    const handleBookSubmit = (e) => {
        e.preventDefault();
        const todayStr = new Date().toISOString().split('T')[0];
        if (bookDate < todayStr) {
            alert("Cannot book an appointment for a past date.");
            return;
        }
        if (!selectedSlot) {
            alert("Please choose an available time slot.");
            return;
        }

        fetch(`${SERVICES.APPOINTMENT}/api/appointments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                patientId: user.patientId,
                doctorId: selectedDoctor.id,
                date: bookDate,
                timeSlot: selectedSlot
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(json => {
                    throw new Error(json.message || "Booking failed.");
                }).catch(() => {
                    return res.text().then(text => { throw new Error(text || "Booking failed.") });
                });
            }
            return res.json();
        })
        .then(() => {
            alert("Appointment booked successfully!");
            setIsBookingModalOpen(false);
            setSelectedSlot('');
            reloadAppointments();
        })
        .catch(err => alert(err.message));
    };

    const handleCompleteSubmit = (e) => {
        e.preventDefault();
        const appId = selectedAppointmentForComplete.id;

        // 1. Complete Appointment
        fetch(`${SERVICES.APPOINTMENT}/api/appointments/${appId}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to complete appointment status.");
            return res.json();
        })
        .then(() => {
            // 2. Submit notes if filled
            if (symptoms || diagnosis || treatmentPlan || notes) {
                return fetch(`${SERVICES.APPOINTMENT}/api/appointments/${appId}/notes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ symptoms, diagnosis, treatmentPlan, notes })
                });
            }
        })
        .then(() => {
            // 3. Submit prescription if filled
            if (medication) {
                return fetch(`${SERVICES.APPOINTMENT}/api/appointments/${appId}/prescription`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ medication, dosage, instructions })
                });
            }
        })
        .then(() => {
            alert("Consultation records successfully logged!");
            setIsCompleteModalOpen(false);
            // Reset fields
            setSymptoms(''); setDiagnosis(''); setTreatmentPlan(''); setNotes('');
            setMedication(''); setDosage(''); setInstructions('');
            reloadAppointments();
        })
        .catch(err => alert(err.message));
    };
    const searchFilteredAppointments = (appointments || []).filter(a => {
        if (!globalSearchQuery) return true;
        const query = globalSearchQuery.toLowerCase();
        const nameCol = user.role === 'PATIENT' ? 
            `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 
            `${a.patient.firstName} ${a.patient.lastName}`;
        const specialization = a.doctor.specialization || '';
        return nameCol.toLowerCase().includes(query) || 
               specialization.toLowerCase().includes(query) ||
               String(a.id).includes(query);
    });

    return (
        <section className="screen active">
            <h3 className="section-title">
                <i className="fa-solid fa-calendar-check" style={{ marginRight: '8px', color: 'var(--color-primary-light)' }}></i>
                Scheduled Consultation Sessions
            </h3>

            <div className="glass-card" style={{ padding: '20px', marginBottom: '40px', overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>ID</th>
                            <th style={{ padding: '12px' }}>Party</th>
                            <th style={{ padding: '12px' }}>Date</th>
                            <th style={{ padding: '12px' }}>Time Slot</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {searchFilteredAppointments.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                                    No consultation sessions scheduled.
                                </td>
                            </tr>
                        ) : (
                            searchFilteredAppointments.map(a => {
                                const nameCol = user.role === 'PATIENT' ? 
                                    `Dr. ${a.doctor.firstName} ${a.doctor.lastName} (${a.doctor.specialization})` : 
                                    `${a.patient.firstName} ${a.patient.lastName}`;
                                
                                return (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px' }}>#{a.id}</td>
                                        <td style={{ padding: '12px' }}>{highlightMatch(nameCol, globalSearchQuery)}</td>
                                        <td style={{ padding: '12px' }}>{a.appointmentDate}</td>
                                        <td style={{ padding: '12px' }}><strong>{a.timeSlot}</strong></td>
                                        <td style={{ padding: '12px' }}>
                                            <span className={`status-pill ${a.status.toLowerCase()}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {user.role === 'PATIENT' && (
                                                        <button className="btn btn-mini btn-danger" onClick={() => handleCancel(a.id)}>
                                                            Cancel
                                                        </button>
                                                    )}
                                                    {user.role === 'DOCTOR' && (
                                                        <button 
                                                            className="btn btn-mini btn-success" 
                                                            onClick={() => {
                                                                setSelectedAppointmentForComplete(a);
                                                                setIsCompleteModalOpen(true);
                                                            }}
                                                        >
                                                            Complete
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Locked</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {user.role === 'PATIENT' && (
                <>
                    <h3 className="section-title">
                        <i className="fa-solid fa-user-md" style={{ marginRight: '8px', color: 'var(--color-primary-light)' }}></i>
                        Book a New Teleconsultation
                    </h3>

                    {/* Filters */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Search Doctor</label>
                            <input 
                                type="text" 
                                placeholder="Search by name..." 
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSpecFilter(''); }}
                            />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Filter Specialization</label>
                            <select value={specFilter} onChange={e => { setSpecFilter(e.target.value); setSearchQuery(''); }}>
                                <option value="">All Specializations</option>
                                {Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))).map(spec => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Doctors Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                        {doctors.map(d => {
                            const slots = d.availabilitySlots ? d.availabilitySlots.split(',') : [];
                            return (
                                <div key={d.id} className="doctor-card glass-card">
                                    <div className="doc-card-header">
                                        <div className="doc-avatar"><i className="fa-solid fa-user-doctor"></i></div>
                                        <div className="doc-name">
                                            <h3>{highlightMatch(`Dr. ${d.firstName} ${d.lastName}`, searchQuery || globalSearchQuery)}</h3>
                                            <span>{highlightMatch(d.specialization, searchQuery || globalSearchQuery)}</span>
                                        </div>
                                    </div>
                                    <div className="doc-contact-info">
                                        <div><i className="fa-solid fa-envelope"></i> {d.email}</div>
                                        <div><i className="fa-solid fa-phone"></i> {d.phone || 'N/A'}</div>
                                    </div>
                                    <div className="slots-preview-title">Availability Slots</div>
                                    <div className="slots-preview-container" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', margin: '8px 0 15px 0' }}>
                                        {slots.map((s, idx) => (
                                            <span key={idx} className="slot-badge-preview">{s.trim()}</span>
                                        ))}
                                    </div>
                                    <button 
                                        className="btn btn-primary btn-block"
                                        onClick={() => {
                                            setSelectedDoctor(d);
                                            setIsBookingModalOpen(true);
                                        }}
                                    >
                                        Book Teleconsultation
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Booking Modal Overlay */}
            {isBookingModalOpen && selectedDoctor && (
                <div className="modal-overlay active">
                    <div className="modal glass-card" style={{ padding: '30px', maxWidth: '450px' }}>
                        <h3 className="section-title">Schedule Appointment</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                            Booking slot with <strong>Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</strong>
                        </p>

                        <form onSubmit={handleBookSubmit}>
                            <div className="form-group">
                                <label>Appointment Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    min={new Date().toISOString().split('T')[0]}
                                    value={bookDate} 
                                    onChange={e => setBookDate(e.target.value)} 
                                />
                            </div>

                            <div className="form-group">
                                <label>Available Slots</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {(selectedDoctor.availabilitySlots ? selectedDoctor.availabilitySlots.split(',') : []).map((s, idx) => {
                                        const trimmed = s.trim();
                                        return (
                                            <div 
                                                key={idx}
                                                className={`slot-select-badge ${selectedSlot === trimmed ? 'selected' : ''}`}
                                                onClick={() => setSelectedSlot(trimmed)}
                                            >
                                                {trimmed}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsBookingModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Confirm Book
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Complete Consultation Modal Overlay */}
            {isCompleteModalOpen && selectedAppointmentForComplete && (
                <div className="modal-overlay active">
                    <div className="modal glass-card" style={{ padding: '30px', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 className="section-title">Complete Consultation & Log Records</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                            Patient: <strong>{selectedAppointmentForComplete.patient.firstName} {selectedAppointmentForComplete.patient.lastName}</strong>
                        </p>

                        <form onSubmit={handleCompleteSubmit}>
                            <h4 style={{ fontSize: '14px', color: 'var(--color-primary-light)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                Consultation Notes
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Chief Symptoms</label>
                                    <input type="text" placeholder="e.g. Dry Cough, Mild Fever" value={symptoms} onChange={e => setSymptoms(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Diagnosis</label>
                                    <input type="text" placeholder="e.g. Acute Bronchitis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Treatment Plan</label>
                                    <input type="text" placeholder="e.g. Bed rest, steam inhalation" value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Internal Notes</label>
                                    <textarea rows="2" placeholder="Specify clinical findings..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '14px', color: 'var(--color-primary-light)', margin: '20px 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                Prescription Script (Optional)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Medication Name</label>
                                    <input type="text" placeholder="e.g. Amoxicillin 500mg" value={medication} onChange={e => setMedication(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Dosage</label>
                                    <input type="text" placeholder="e.g. 1 capsule thrice daily" value={dosage} onChange={e => setDosage(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Special Instructions</label>
                                    <input type="text" placeholder="e.g. Take after meals, complete full course" value={instructions} onChange={e => setInstructions(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCompleteModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Submit Consultation Records
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
