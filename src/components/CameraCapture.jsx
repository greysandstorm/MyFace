import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';

export default function CameraCapture({ onCapture }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState('user');

    const startCamera = async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please allow permissions or use upload.");
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [facingMode]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/png');
        onCapture(dataUrl);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => onCapture(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="camera-container">
            <div className="camera-viewport">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="video-feed"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div className="camera-controls">
                <label className="btn-icon">
                    <Upload />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                </label>

                <button onClick={handleCapture} className="btn-capture">
                    <div className="shutter-inner" />
                </button>

                <button onClick={switchCamera} className="btn-icon">
                    <RefreshCw />
                </button>
            </div>

            <style>{`
                .camera-container {
                    position: relative;
                    width: 100%;
                    max-width: 500px;
                    margin: 0 auto;
                    border-radius: 20px;
                    overflow: hidden;
                    background: #000;
                }
                .video-feed {
                    width: 100%;
                    display: block;
                }
                .camera-controls {
                    position: absolute;
                    bottom: 20px;
                    left: 0;
                    width: 100%;
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    padding: 0 20px;
                }
                .btn-icon {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 12px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-capture {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    border: 4px solid white;
                    background: transparent;
                    padding: 4px;
                    cursor: pointer;
                }
                .shutter-inner {
                    width: 100%;
                    height: 100%;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.1s;
                }
                .btn-capture:active .shutter-inner {
                    transform: scale(0.9);
                }
            `}</style>
        </div>
    );
}
