import * as faceapi from 'face-api.js';

// Load models from CDN to avoid hosting large binary files in the repo
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
};

export const detectFace = async (imageElement) => {
    const detection = await faceapi.detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();
    return detection;
};

// Define zones based on 68-point landmarks
// Landmarks: 0-16 (Jaw), 17-21 (Left Brow), 22-26 (Right Brow), 27-35 (Nose), 36-41 (Left Eye), 42-47 (Right Eye), 48-67 (Mouth)
const getZonePolygons = (landmarks) => {
    const points = landmarks.positions;

    // Helper to get {x,y} from index
    const p = (i) => points[i];

    return {
        forehead: [
            p(17), p(21), p(22), p(26), // Brows
            { x: p(26).x, y: p(26).y - 60 }, // Project Up
            { x: p(17).x, y: p(17).y - 60 }  // Project Up
        ],
        cheeks: [
            p(0), p(3), p(31), p(48), // Left Cheek bound
            p(13), p(16), p(54), p(35) // Right Cheek bound (splitting for simplicity)
        ],
        chin: [
            p(5), p(11), p(57) // Jaw to Mouth bottom
        ],
        nose: [
            p(27), p(31), p(35)
        ]
    };
};

// Check if a point is inside a polygon (Ray Casting algo)
const isInside = (point, vs) => {
    // ray-casting algorithm based on
    // https://github.com/substack/point-in-polygon
    const x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

export const analyzeZones = (detection, blemishCanvas) => {
    if (!detection) return null;

    const landmarks = detection.landmarks;
    const zones = getZonePolygons(landmarks);
    const scores = { forehead: 0, cheeks: 0, chin: 0, nose: 0 };

    const ctx = blemishCanvas.getContext('2d');
    const width = blemishCanvas.width;
    const height = blemishCanvas.height;
    const imgData = ctx.getImageData(0, 0, width, height).data;

    // Scan for "blemish" pixels (Red pixels in our overlay)
    // Assuming blemishCanvas is the RED overlay (transparent with red dots)
    // Or if it's the gray filter, we need a threshold.
    // Let's assume passed canvas is the *processed red channel* gray image.
    // We count "dark" pixels as blemishes.

    let totalPixels = 0;

    for (let y = 0; y < height; y += 4) { // Skip some pixels for speed
        for (let x = 0; x < width; x += 4) {
            const index = (y * width + x) * 4;
            const brightness = imgData[index]; // Gray value

            // Threshold: < 50 (Very dark spot in the red-reduced image)
            if (brightness < 60) {
                const point = { x, y };

                if (isInside(point, zones.forehead)) scores.forehead++;
                else if (isInside(point, zones.cheeks)) scores.cheeks++; // Needs better polygon logic for split cheeks
                else if (isInside(point, zones.chin)) scores.chin++;
                else if (isInside(point, zones.nose)) scores.nose++;
            }
        }
    }

    return scores;
};

export const RECOMMENDATIONS = {
    forehead: {
        cause: "Stress, Sleep, Digestion",
        advice: "Try to get more sleep (7-8 hours). Drink more water to aid digestion. Reduce processed sugar intake."
    },
    cheeks: {
        cause: "Respiratory, Pollution, Bacteria",
        advice: "Clean your phone screen and pillowcases. Spend time in fresh air if possible. Avoid touching your face."
    },
    chin: {
        cause: "Hormonal Imbalance",
        advice: "Monitor your cycle. Reduce stress levels as cortisol spikes can trigger breakouts here. Eating leafy greens may help."
    },
    nose: {
        cause: "Heart, Blood Pressure",
        advice: "Check your blood pressure. Reduce spicy foods and salt. Eat more 'cooling' foods like cucumber."
    }
};
