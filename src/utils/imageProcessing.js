/**
 * Inflammation Overlay Filter — Face-Isolated, Redness-Based
 * 
 * This filter ONLY highlights blemishes within the face region.
 * It uses actual redness detection (R channel vs G/B) instead of
 * simple darkness, so shadows and dark backgrounds are ignored.
 * 
 * @param {string} imageDataUrl - The captured selfie.
 * @param {Array} facePolygon - Array of {x, y} points defining the face outline (from face-api.js landmarks).
 * @returns {Promise<string>} - Original image with red overlay on inflamed skin areas.
 */

// Ray-casting point-in-polygon test
function isInsidePolygon(px, py, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > py) !== (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export const applyBlemishFilter = (imageDataUrl, facePolygon) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            // If no face polygon provided, just return original
            if (!facePolygon || facePolygon.length < 3) {
                resolve(imageDataUrl);
                return;
            }

            // Pre-compute a face mask bitmap for speed
            // (checking polygon per-pixel is expensive, so we do it at 1/4 resolution and upscale)
            const step = 2;
            const maskW = Math.ceil(width / step);
            const maskH = Math.ceil(height / step);
            const mask = new Uint8Array(maskW * maskH);
            for (let my = 0; my < maskH; my++) {
                for (let mx = 0; mx < maskW; mx++) {
                    if (isInsidePolygon(mx * step, my * step, facePolygon)) {
                        mask[my * maskW + mx] = 1;
                    }
                }
            }

            const isFace = (x, y) => {
                const mx = Math.floor(x / step);
                const my = Math.floor(y / step);
                if (mx < 0 || mx >= maskW || my < 0 || my >= maskH) return false;
                return mask[my * maskW + mx] === 1;
            };

            // Create output copy
            const outputData = ctx.createImageData(width, height);
            const out = outputData.data;
            for (let i = 0; i < data.length; i++) out[i] = data[i];

            const getIndex = (x, y) => (y * width + x) * 4;
            const radius = 4;

            // Helper: get clamped pixel channels
            const getPixel = (x, y) => {
                x = Math.max(0, Math.min(width - 1, x));
                y = Math.max(0, Math.min(height - 1, y));
                const i = getIndex(x, y);
                return { r: data[i], g: data[i + 1], b: data[i + 2] };
            };

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    // SKIP pixels outside the face
                    if (!isFace(x, y)) continue;

                    const i = getIndex(x, y);
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // --- Redness Detection ---
                    // Blemishes/inflammation: R is high relative to G and B
                    // Shadows: all channels drop proportionally
                    // We look for: R significantly > G, and R significantly > B
                    const redness = r - ((g + b) / 2);

                    // Also check local contrast (high-pass) in the redness channel
                    // to avoid flagging uniformly reddish skin
                    let localAvgRedness = 0;
                    let count = 0;
                    for (let ky = -radius; ky <= radius; ky += 2) {
                        for (let kx = -radius; kx <= radius; kx += 2) {
                            const p = getPixel(x + kx, y + ky);
                            localAvgRedness += p.r - ((p.g + p.b) / 2);
                            count++;
                        }
                    }
                    localAvgRedness /= count;

                    // How much REDDER is this pixel than its neighbors?
                    const localDiff = redness - localAvgRedness;

                    // Minimum redness threshold (pixel must actually be reddish)
                    const isReddish = redness > 15;
                    // Local anomaly threshold (must be redder than surroundings)
                    const isAnomaly = localDiff > 5;
                    // Brightness gate: ignore very dark pixels (shadows, hair)
                    const brightness = (r + g + b) / 3;
                    const isBrightEnough = brightness > 50 && brightness < 240;

                    if (isReddish && isAnomaly && isBrightEnough) {
                        const intensity = Math.min(1, localDiff / 30);

                        // Blend red overlay
                        out[i] = Math.min(255, r + Math.round(140 * intensity));
                        out[i + 1] = Math.max(0, Math.round(g * (1 - intensity * 0.6)));
                        out[i + 2] = Math.max(0, Math.round(b * (1 - intensity * 0.6)));
                    }
                }
            }

            ctx.putImageData(outputData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
        img.src = imageDataUrl;
    });
};
