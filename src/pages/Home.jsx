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
                console.log("FaceAPI Models Loaded");
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

        // Create an image element for FaceAPI
        const imgEntry = new Image();
        imgEntry.src = imgData;

        // Process everything
        setTimeout(async () => {
            try {
                // 1. Red Channel Filter
                const filteredUrl = await applyBlemishFilter(imgData);
                setProcessedImage(filteredUrl);

                // 2. Face Detection & Zone Analysis
                if (modelsLoaded) {
                    const detection = await detectFace(imgEntry);
                    if (detection) {
                        // We need the processed canvas to analyze pixels
                        const tempCanvas = document.createElement('canvas');
                        const ctx = tempCanvas.getContext('2d');
                        const pImg = new Image();
                        pImg.src = filteredUrl;
                        await new Promise(r => pImg.onload = r);
                        tempCanvas.width = pImg.width;
                        tempCanvas.height = pImg.height;
                        ctx.drawImage(pImg, 0, 0);

                        const scores = analyzeZones(detection, tempCanvas);

                        // Determine top concern
                        // Simply finding zone with highest "blemish count"
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
                                scores: scores // Save full scores
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
                <button onClick={() => setIsCameraOpen(false)} className="btn-text">
                    Cancel
                </button>
            </div>
        );
    }

    if (image) {
        return (
            <div className="container results-view">
                <div className="image-comparison">
                    <div className="img-card">
                        <h3>Original</h3>
                        <img src={image} alt="Original" />
                    </div>
                    <div className="img-card">
                        <h3>Red Channel Scan</h3>
                        {isProcessing ? (
                            <div className="loading"><Loader className="spin" /> Scanning...</div>
                        ) : (
                            <img src={processedImage} alt="Analysis" className="img-filter" />
                        )}
                    </div>
                </div>

                {analysis && (
                    <div className="analysis-card">
                        <h2>🔎 Detected Focus Area: <span className="highlight">{analysis.zone.toUpperCase()}</span></h2>
                        <p><strong>Possible Cause:</strong> {analysis.details.cause}</p>
                        <div className="advice-box">
                            <strong>Recommendation:</strong>
                            <p>{analysis.details.advice}</p>
                        </div>
                    </div>
                )}

                <div className="controls">
                    <button onClick={reset} className="btn-secondary">Retake</button>
                    <button onClick={handleSave} className="btn-primary">Save to History <ArrowRight /></button>
                </div>

                <style>{`
            .results-view { max-width: 800px; width: 100%; }
            .image-comparison {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                justify-content: center;
                margin-bottom: 2rem;
            }
            .img-card {
                flex: 1;
                min-width: 300px;
                background: #1a1a1a;
                padding: 10px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            .img-card h3 { margin-top: 0; font-size: 0.9rem; opacity: 0.8; }
            .img-card img {
                width: 100%;
                border-radius: 8px;
                display: block;
            }
            .img-filter {
                filter: contrast(1.2) grayscale(1);
            }
            .analysis-card {
                background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
                padding: 2rem;
                border-radius: 16px;
                text-align: left;
                margin-bottom: 2rem;
                border: 1px solid #444;
            }
            .highlight { color: #ff6b6b; }
            .advice-box {
                background: rgba(255, 255, 255, 0.05);
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                border-left: 4px solid #ff6b6b;
            }
            .controls { display: flex; gap: 1rem; justify-content: center; }
            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
            </div>
        );
    }

    return (
        <div className="container home-container">
            <div className="hero">
                <h1>MyFace</h1>
                <p className="subtitle">Daily skin analysis powered by AI & TCM.</p>
            </div>

            {!modelsLoaded ? (
                <div className="loading-models"><Loader className="spin" /> Loading AI Models...</div>
            ) : (
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => setIsCameraOpen(true)}>
                        <Camera size={24} />
                        Check My Skin
                    </button>

                    <Link to="/history" className="btn-secondary">
                        <History size={24} />
                        History
                    </Link>
                </div>
            )}

            <style>{`
        .home-container { min-height: 80vh; }
        .hero h1 {
            font-size: 3.5rem;
            line-height: 1.1;
            background: linear-gradient(to right, #fff, #aaa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        .subtitle { font-size: 1.2rem; opacity: 0.7; max-width: 400px; margin: 0 auto 3rem auto; }
        .btn-primary {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-size: 1.1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: transform 0.2s;
        }
        .btn-primary:hover { transform: scale(1.05); background: #ff5252; }
        .btn-secondary {
            background: transparent;
            color: white;
            border: 2px solid #555;
            padding: 0.9rem 1.8rem;
            border-radius: 50px;
            font-size: 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
        }
        .loading-models { opacity: 0.5; display: flex; gap: 10px; align-items: center; }
      `}</style>
        </div>
    );
}
