import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, History, ArrowRight, Loader, RotateCcw } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import { applyBlemishFilter } from '../utils/imageProcessing';
import { loadModels, detectFace, analyzeZones, RECOMMENDATIONS } from '../utils/faceMapping';
import { saveLog } from '../utils/db';

export default function Home() {
    const navigate = useNavigate();
    const [image, setImage] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                await loadModels();
                setModelsLoaded(true);
            } catch (e) {
                console.error("Failed to load models", e);
            }
        };
        init();
    }, []);

    const handleCapture = async (imgData) => {
        // Clear ALL previous state first (fixes ghosting)
        setProcessedImage(null);
        setAnalysis(null);

        setImage(imgData);
        setIsCameraOpen(false);
        setIsProcessing(true);

        const imgEntry = new Image();
        imgEntry.src = imgData;
        await new Promise(r => { imgEntry.onload = r; });

        try {
            let facePolygon = null;
            let detection = null;

            // 1. Detect face FIRST to get the face outline
            if (modelsLoaded) {
                detection = await detectFace(imgEntry);
                if (detection) {
                    // Build face outline polygon from landmarks:
                    // Jawline (points 0-16) + forehead estimated from brow points (17-26)
                    const pts = detection.landmarks.positions;
                    const jawline = [];
                    for (let i = 0; i <= 16; i++) {
                        jawline.push({ x: pts[i].x, y: pts[i].y });
                    }
                    // Project forehead above the eyebrows
                    const browTop = [];
                    for (let i = 26; i >= 17; i--) {
                        browTop.push({ x: pts[i].x, y: pts[i].y - 50 });
                    }
                    facePolygon = [...jawline, ...browTop];
                }
            }

            // 2. Apply red inflammation overlay (only inside face polygon)
            const filteredUrl = await applyBlemishFilter(imgData, facePolygon);
            setProcessedImage(filteredUrl);

            // 3. Zone Analysis
            if (detection) {
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                const pImg = new Image();
                pImg.src = filteredUrl;
                await new Promise(r => pImg.onload = r);
                tempCanvas.width = pImg.width;
                tempCanvas.height = pImg.height;
                ctx.drawImage(pImg, 0, 0);

                const scores = analyzeZones(detection, tempCanvas);

                let maxScore = 0;
                let topZone = null;
                Object.entries(scores).forEach(([zone, score]) => {
                    if (score > maxScore) {
                        maxScore = score;
                        topZone = zone;
                    }
                });

                if (topZone) {
                    setAnalysis({
                        zone: topZone,
                        details: RECOMMENDATIONS[topZone],
                        scores: scores
                    });
                }
            } else {
                console.warn("No face detected — overlay applied to full image as fallback.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to process image");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!image) return;
        try {
            await saveLog({
                originalImage: image,
                processedImage: processedImage,
                analysis: analysis
            });
            // Reset state after saving
            reset();
            navigate('/history');
        } catch (e) {
            console.error(e);
            alert("Failed to save log");
        }
    };

    const reset = () => {
        setImage(null);
        setProcessedImage(null);
        setAnalysis(null);
        setIsCameraOpen(false);
        setIsProcessing(false);
    };

    // ---------- CAMERA VIEW ----------
    if (isCameraOpen) {
        return (
            <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <CameraCapture onCapture={handleCapture} />
                <button onClick={() => setIsCameraOpen(false)} style={{
                    background: 'transparent', border: 'none', color: '#888',
                    cursor: 'pointer', fontSize: '0.95rem', padding: '0.5rem'
                }}>Cancel</button>
            </div>
        );
    }

    // ---------- RESULTS VIEW ----------
    if (image) {
        return (
            <div className="container animate-in" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                {/* Single Image: shows processed (red overlay) or original while loading */}
                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                    <img
                        src={processedImage || image}
                        alt="Skin Analysis"
                        style={{ width: '100%', display: 'block' }}
                    />
                    {isProcessing && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column', gap: '12px', color: 'white'
                        }}>
                            <Loader className="spin" size={28} />
                            <span style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                Analyzing skin...
                            </span>
                        </div>
                    )}
                </div>

                {/* Analysis Results */}
                {analysis && (
                    <div className="card" style={{
                        marginTop: '1.5rem', textAlign: 'left',
                        borderLeft: '4px solid var(--accent)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <span style={{
                                background: 'var(--accent)', color: 'white',
                                padding: '4px 12px', borderRadius: '100px',
                                fontSize: '0.75rem', fontWeight: '700',
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}>
                                {analysis.zone}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Primary area of concern
                            </span>
                        </div>

                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', lineHeight: '1.6' }}>
                            <strong>Linked to:</strong>{' '}
                            <span style={{ color: 'var(--text-muted)' }}>{analysis.details.cause}</span>
                        </p>

                        <div style={{
                            background: 'rgba(255,71,87,0.08)', padding: '1rem',
                            borderRadius: '10px', fontSize: '0.95rem', lineHeight: '1.6'
                        }}>
                            💡 {analysis.details.advice}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1.5rem' }}>
                    <button onClick={reset} className="btn-secondary" style={{ flex: 1 }}>
                        <RotateCcw size={16} /> Retake
                    </button>
                    <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>
                        Save <ArrowRight size={16} />
                    </button>
                </div>

                <style>{`
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    // ---------- HOME / LANDING VIEW ----------
    return (
        <div className="container" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '80vh'
        }}>
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ letterSpacing: '-2px' }}>MyFace</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '350px', margin: '0 auto' }}>
                    Scan your skin. Spot inflammation. Get personalized recommendations.
                </p>
            </div>

            {!modelsLoaded ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#666' }}>
                    <Loader className="spin" size={16} /> Loading AI models...
                    <style>{`
                        .spin { animation: spin 1s linear infinite; }
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                    `}</style>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
                    <button className="btn-primary" onClick={() => setIsCameraOpen(true)}>
                        <Camera size={20} /> Start Scan
                    </button>
                    <Link to="/history" className="btn-secondary">
                        <History size={20} /> My Journal
                    </Link>
                </div>
            )}
        </div>
    );
}
