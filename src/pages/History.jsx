import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Download } from 'lucide-react';
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
        if (confirm("Are you sure you want to clear all history? This cannot be undone.")) {
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
        a.download = `myface-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link to="/" className="btn-icon-text">
                    <ArrowLeft size={18} /> Back
                </Link>
                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Journey</h1>
            </header>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                <button onClick={handleExport} className="btn-icon-text" disabled={logs.length === 0}>
                    <Download size={16} /> Export
                </button>
                <button onClick={handleClear} className="btn-icon-text" style={{ color: '#ff4757' }} disabled={logs.length === 0}>
                    <Trash2 size={16} /> Clear
                </button>
            </div>

            {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666', border: '1px dashed #333', borderRadius: '16px' }}>
                    <p>No records found. Start your first scan.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {logs.map((log) => (
                        <div key={log.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#888', fontSize: '0.9rem' }}>{new Date(log.timestamp).toLocaleDateString()}</span>
                                {log.analysis && (
                                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                        {log.analysis.zone}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', height: '180px' }}>
                                <img src={log.originalImage} style={{ width: '50%', objectFit: 'cover' }} alt="Original" />
                                <img src={log.processedImage} style={{ width: '50%', objectFit: 'cover', filter: 'contrast(1.1)' }} alt="Analysis" />
                            </div>
                            {log.analysis && (
                                <div style={{ padding: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
                                    {log.analysis.details.cause}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
