import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, History, ArrowRight, Loader } from 'lucide-react';
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
        setImage(imgData);
        setIsCameraOpen(false);
        setIsProcessing(true);
        setAnalysis(null);

        const imgEntry = new Image();
        imgEntry.src = imgData;

        setTimeout(async () => {
            try {
                const filteredUrl = await applyBlemishFilter(imgData);
                setProcessedImage(filteredUrl);

                if (modelsLoaded) {
                    const detection = await detectFace(imgEntry);
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
                        console.warn("No face detected.");
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Failed to process image");
            } finally {
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleSave = async () => {
        if (!image) return;
        try {
            await saveLog({
                originalImage: image,
                processedImage: processedImage,
                analysis: analysis
            });
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
    };

    if (isCameraOpen) {
        return (
            <div className="container">
                <CameraCapture onCapture={handleCapture} />
                <button onClick={() => setIsCameraOpen(false)} className="btn-text" style={{ marginTop: '1rem', color: '#888' }}>
                    Cancel
                </button>
            </div>
        );
    }

    if (image) {
        return (
            <div className="container animate-in" style={{ maxWidth: '800px', width: '100%' }}>
                <div className="grid-2">
                    <div className="img-wrapper">
                        <span className="label">Original</span>
                        <img src={image} alt="Original" />
                    </div>
                    <div className="img-wrapper">
                        <span className="label">Texture Scan</span>
                        {isProcessing ? (
                            <div className="loading-state"><Loader className="spin" /> Converting...</div>
                        ) : (
                            <img src={processedImage} alt="Analysis" style={{ filter: 'contrast(1.1)' }} />
                        )}
                    </div>
                </div>

                {analysis && (
                    <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid var(--accent)' }}>
                        <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--accent)' }}>●</span>
                            Primary Focus: {analysis.zone.toUpperCase()}
                        </h2>
                        <p style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            Potentially linked to: <strong style={{ color: 'var(--text-main)' }}>{analysis.details.cause}</strong>
                        </p>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>{analysis.details.advice}</p>
                        </div>
                    </div>
                )}

                <div className="controls" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button onClick={reset} className="btn-secondary">Retake</button>
                    <button onClick={handleSave} className="btn-primary">Save to History <ArrowRight size={18} /></button>
                </div>

                <style>{`
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .img-wrapper { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
                    .img-wrapper img { width: 100%; display: block; }
                    .label { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
                    .loading-state { height: 300px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #666; }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ letterSpacing: '-2px' }}>MyFace</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Advanced Skin Health Intelligence</p>
            </div>

            {!modelsLoaded ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#666' }}>
                    <Loader className="spin" size={16} /> Initializing AI...
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
                    <button className="btn-primary" onClick={() => setIsCameraOpen(true)}>
                        <Camera size={20} />
                        Start Analysis
                    </button>

                    <Link to="/history" className="btn-secondary">
                        <History size={20} />
                        View History
                    </Link>
                </div>
            )}
        </div>
    );
}
