import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Calendar, MapPin } from 'lucide-react';
import { getLogs, clearLogs } from '../utils/db';

export default function HistoryPage() {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await getLogs();
            setLogs(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleClear = async () => {
        if (confirm("Clear your entire journal? This cannot be undone.")) {
            await clearLogs();
            loadLogs();
        }
    };

    const handleExport = () => {
        const json = JSON.stringify(logs, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `myface-journal-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const formatDate = (timestamp) => {
        const d = new Date(timestamp);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp) => {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <Link to="/" className="btn-icon-text">
                    <ArrowLeft size={18} /> Back
                </Link>
                <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>My Journal</h1>
            </header>

            {/* Toolbar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                </span>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={handleExport} className="btn-icon-text" disabled={logs.length === 0}>
                        <Download size={14} /> Export
                    </button>
                    <button onClick={handleClear} className="btn-icon-text"
                        style={{ color: logs.length > 0 ? '#ff4757' : undefined }}
                        disabled={logs.length === 0}>
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {logs.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '4rem 2rem',
                    border: '1px dashed #333', borderRadius: '16px'
                }}>
                    <p style={{ color: '#555', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                        No entries yet
                    </p>
                    <p style={{ color: '#444', fontSize: '0.9rem', margin: 0 }}>
                        Take your first scan to start tracking
                    </p>
                </div>
            ) : (
                /* Timeline / Journal Entries */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {logs.map((log, idx) => (
                        <div key={log.id} className="card" style={{
                            padding: 0, overflow: 'hidden',
                            animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`
                        }}>
                            {/* Image row: original + overlay side by side */}
                            <div style={{ display: 'flex', height: '200px' }}>
                                <img
                                    src={log.originalImage}
                                    style={{ width: '50%', objectFit: 'cover' }}
                                    alt="Original"
                                />
                                {log.processedImage && (
                                    <img
                                        src={log.processedImage}
                                        style={{ width: '50%', objectFit: 'cover' }}
                                        alt="Analysis overlay"
                                    />
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ padding: '1rem' }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', marginBottom: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} style={{ color: '#555' }} />
                                        <span style={{ color: '#999', fontSize: '0.85rem' }}>
                                            {formatDate(log.timestamp)}
                                        </span>
                                        <span style={{ color: '#555', fontSize: '0.8rem' }}>
                                            {formatTime(log.timestamp)}
                                        </span>
                                    </div>

                                    {log.analysis && (
                                        <span style={{
                                            background: 'rgba(255,71,87,0.15)',
                                            color: 'var(--accent)',
                                            padding: '3px 10px', borderRadius: '100px',
                                            fontSize: '0.7rem', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '0.03em'
                                        }}>
                                            <MapPin size={10} style={{ display: 'inline', marginRight: '3px' }} />
                                            {log.analysis.zone}
                                        </span>
                                    )}
                                </div>

                                {log.analysis && (
                                    <div>
                                        <p style={{
                                            margin: '0 0 0.5rem 0', fontSize: '0.9rem',
                                            color: 'var(--text-main)'
                                        }}>
                                            {log.analysis.details.cause}
                                        </p>
                                        <p style={{
                                            margin: 0, fontSize: '0.85rem',
                                            color: 'var(--text-muted)', lineHeight: '1.5'
                                        }}>
                                            💡 {log.analysis.details.advice}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
