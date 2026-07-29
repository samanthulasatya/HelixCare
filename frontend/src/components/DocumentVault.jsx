import React, { useState, useEffect, useRef } from 'react';

export default function DocumentVault({ user, token, appointments, searchQuery }) {
    const [vaultFiles, setVaultFiles] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [uploadCategory, setUploadCategory] = useState('Lab Report');
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);

    // Build patient directory list for doctor role
    const getPatientList = () => {
        if (!appointments) return [];
        const seen = new Set();
        const list = [];
        appointments.forEach(a => {
            if (a.patient && !seen.has(a.patient.id)) {
                seen.add(a.patient.id);
                list.push(a.patient);
            }
        });
        return list;
    };

    const patientList = getPatientList();

    // Load files from backend API with localStorage fallback
    const loadVaultData = () => {
        const targetId = user.role === 'PATIENT' ? user.patientId : selectedPatientId;
        if (!targetId) {
            setVaultFiles([]);
            return;
        }

        fetch(`https://helixcare.duckdns.org/api/patients/${targetId}/documents`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("Could not fetch documents");
            return res.json();
        })
        .then(data => {
            setVaultFiles(data);
            // Sync locally
            localStorage.setItem(`helix_vault_${targetId}`, JSON.stringify(data));
        })
        .catch(err => {
            console.warn("REST vault error, falling back to local database:", err);
            const dataStr = localStorage.getItem(`helix_vault_${targetId}`) || '[]';
            setVaultFiles(JSON.parse(dataStr));
        });
    };

    useEffect(() => {
        loadVaultData();
    }, [selectedPatientId, user]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Size check (max 1MB)
        if (file.size > 1024 * 1024) {
            setUploadError("File size exceeds 1MB limit.");
            return;
        }
        setUploadError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result;
            const newFile = {
                id: Date.now(),
                name: file.name,
                type: file.type,
                category: uploadCategory,
                dataUrl: base64Data,
                timestamp: new Date().toLocaleString()
            };

            const targetId = user.role === 'PATIENT' ? user.patientId : selectedPatientId;

            // Push to backend
            fetch(`https://helixcare.duckdns.org/api/patients/${targetId}/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newFile)
            })
            .then(res => {
                if (!res.ok) throw new Error("Backend save failed");
                loadVaultData();
            })
            .catch(err => {
                console.warn("Upload REST save failed, writing local backup:", err);
                const localStr = localStorage.getItem(`helix_vault_${targetId}`) || '[]';
                const updated = [newFile, ...JSON.parse(localStr)];
                localStorage.setItem(`helix_vault_${targetId}`, JSON.stringify(updated));
                setVaultFiles(updated);
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDeleteFile = (fileId) => {
        const targetId = user.role === 'PATIENT' ? user.patientId : selectedPatientId;

        // Delete from backend
        fetch(`https://helixcare.duckdns.org/api/patients/${targetId}/documents/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("Backend delete failed");
            loadVaultData();
        })
        .catch(err => {
            console.warn("Delete REST call failed, writing local backup:", err);
            const localStr = localStorage.getItem(`helix_vault_${targetId}`) || '[]';
            const filtered = JSON.parse(localStr).filter(f => f.id !== fileId);
            localStorage.setItem(`helix_vault_${targetId}`, JSON.stringify(filtered));
            setVaultFiles(filtered);
        });
    };

    const filteredFiles = vaultFiles.filter(f => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(query) || 
               f.category.toLowerCase().includes(query);
    });

    return (
        <section className="screen active">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                {/* Header card */}
                <div className="glass-card" style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fa-solid fa-folder-open" style={{ color: 'var(--color-primary-light)' }}></i> Digital Health Vault
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                            Secure clinical document repository for patient charts and lab reports.
                        </p>
                    </div>

                    {user.role === 'DOCTOR' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Review Patient Vault:</label>
                            <select 
                                value={selectedPatientId} 
                                onChange={e => setSelectedPatientId(e.target.value)}
                                style={{ padding: '8px 16px', fontSize: '12.5px', minWidth: '220px' }}
                            >
                                <option value="">-- Choose Patient Record --</option>
                                {patientList.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.firstName} {p.lastName} (ID: #{p.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: user.role === 'PATIENT' ? '300px 1fr' : '1fr', gap: '20px' }}>
                    {/* Patient Uploader side-card */}
                    {user.role === 'PATIENT' && (
                        <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0 }}>
                                <i className="fa-solid fa-cloud-arrow-up"></i> Upload Document
                            </h3>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '12px' }}>Document Category</label>
                                <select 
                                    value={uploadCategory} 
                                    onChange={e => setUploadCategory(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px' }}
                                >
                                    <option value="Lab Report">Lab Report (Blood/Urine)</option>
                                    <option value="X-Ray / Scan">Medical Imaging (X-Ray/MRI/CT)</option>
                                    <option value="Prescription">Prescription Document</option>
                                    <option value="Insurance Claim">Insurance / SOAP Claim</option>
                                    <option value="Other">Other Records</option>
                                </select>
                            </div>

                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                style={{ display: 'none' }} 
                            />

                            {uploadError && (
                                <div style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: 600 }}>
                                    <i className="fa-solid fa-triangle-exclamation"></i> {uploadError}
                                </div>
                            )}

                            <button 
                                className="btn btn-primary" 
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                style={{ width: '100%', gap: '8px' }}
                            >
                                <i className="fa-solid fa-file-import"></i> Browse & Upload File
                            </button>
                            <small style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                Limit: 1MB per document (PDF, PNG, JPG).
                            </small>
                        </div>
                    )}

                    {/* Repository Grid List */}
                    <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '350px' }}>
                        <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0 }}>
                            <i className="fa-solid fa-server"></i> Vault Directory
                        </h3>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                        {user.role === 'DOCTOR' && !selectedPatientId ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <i className="fa-solid fa-folder-closed" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.2 }}></i>
                                <p style={{ fontSize: '13.5px' }}>Please select a patient directory from the dropdown above to load health charts.</p>
                            </div>
                        ) : vaultFiles.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <i className="fa-solid fa-folder-minus" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.2 }}></i>
                                <p style={{ fontSize: '13.5px' }}>No documents uploaded in this vault directory yet.</p>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.2 }}></i>
                                <p style={{ fontSize: '13.5px' }}>No matching documents found for search query.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {filteredFiles.map(file => {
                                    const isImg = file.type && file.type.startsWith('image/');
                                    return (
                                        <div 
                                            key={file.id} 
                                            className="glass-card" 
                                            style={{ 
                                                padding: '15px', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '10px', 
                                                border: '1px solid var(--border-color)',
                                                background: 'rgba(255,255,255,0.015)' 
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                {file.category === 'Prescription' ? (
                                                    <i className="fa-solid fa-prescription-bottle-medical" style={{ fontSize: '24px', color: '#10b981' }}></i>
                                                ) : file.category === 'X-Ray / Scan' ? (
                                                    <i className="fa-solid fa-x-ray" style={{ fontSize: '24px', color: '#3b82f6' }}></i>
                                                ) : file.category === 'Lab Report' ? (
                                                    <i className="fa-solid fa-droplet" style={{ fontSize: '24px', color: '#ef4444' }}></i>
                                                ) : (
                                                    <i className="fa-solid fa-file-medical" style={{ fontSize: '24px', color: '#a78bfa' }}></i>
                                                )}
                                                <div style={{ minWidth: 0, flexGrow: 1 }}>
                                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                                        {file.category}
                                                    </span>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                                        {file.name}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview/Thumbnail */}
                                            {isImg ? (
                                                <img 
                                                    src={file.dataUrl} 
                                                    alt={file.name} 
                                                    style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} 
                                                />
                                            ) : (
                                                <div style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                    PDF / Document File
                                                </div>
                                            )}

                                            <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>
                                                Uploaded: {file.timestamp}
                                            </span>

                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                <a 
                                                    href={file.dataUrl} 
                                                    download={file.name} 
                                                    className="btn btn-secondary" 
                                                    style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center', justifyContent: 'center' }}
                                                >
                                                    <i className="fa-solid fa-download"></i> Get
                                                </a>
                                                {user.role === 'PATIENT' && (
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        onClick={() => handleDeleteFile(file.id)}
                                                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--color-danger)' }}
                                                        title="Delete File"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
