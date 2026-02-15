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
        a.download = `face-health-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <div className="container">
            <header className="history-header">
                <Link to="/" className="btn-icon-text">
                    <ArrowLeft /> Back
                </Link>
                <h1>MyFace Journey</h1>
            </header>

            <div className="toolbar">
                <button onClick={handleExport} className="btn-small" disabled={logs.length === 0}>
                    <Download size={16} /> Export Data
                </button>
                <button onClick={handleClear} className="btn-small danger" disabled={logs.length === 0}>
                    <Trash2 size={16} /> Clear History
                </button>
            </div>

            {logs.length === 0 ? (
                <div className="empty-state">
                    <p>No logs yet. Take your first selfie!</p>
                </div>
            ) : (
                <div className="grid">
                    {logs.map((log) => (
                        <div key={log.id} className="log-card">
                            <div className="card-header">
                                <span className="date">
                                    {new Date(log.timestamp).toLocaleDateString()}
                                </span>
                                {log.analysis && (
                                    <span className="badge">{log.analysis.zone}</span>
                                )}
                            </div>
                            <div className="card-images">
                                <img src={log.originalImage} alt="Original" />
                                <img src={log.processedImage} alt="Analysis" className="img-filter" />
                            </div>
                            {log.analysis && (
                                <div className="card-footer">
                                    <p>{log.analysis.details.cause}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .history-header {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 2rem;
                }
                .btn-icon-text {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: white;
                    text-decoration: none;
                }
                .toolbar {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    width: 100%;
                    margin-bottom: 20px;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                    width: 100%;
                }
                .log-card {
                    background: #1a1a1a;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #333;
                }
                .card-header {
                    padding: 10px 15px;
                    display: flex;
                    justify-content: space-between;
                    background: #252525;
                }
                .date { opacity: 0.7; font-size: 0.9rem; }
                .badge {
                    background: #ff6b6b;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .card-images {
                    display: flex;
                    height: 150px;
                }
                .card-images img {
                    width: 50%;
                    height: 100%;
                    object-fit: cover;
                }
                .img-filter { filter: contrast(1.2) grayscale(1); }
                .card-footer {
                    padding: 10px 15px;
                    font-size: 0.9rem;
                    opacity: 0.8;
                }
                .btn-small {
                    background: transparent;
                    border: 1px solid #555;
                    color: #aaa;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    gap: 5px;
                    align-items: center;
                }
                .btn-small.danger:hover { border-color: red; color: red; }
            `}</style>
        </div>
    );
}
