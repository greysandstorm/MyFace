/**
 * Inflammation Overlay Filter
 * 
 * Instead of producing a separate B&W image, this overlays RED highlights
 * directly onto the original photo where inflammation/blemishes are detected.
 * 
 * Algorithm:
 * 1. For each pixel, compare its Green channel to the local average (high-pass)
 * 2. Pixels significantly darker than their surroundings = potential blemish
 * 3. Paint those pixels RED on top of the original image
 * 
 * @param {string} imageDataUrl - The captured selfie as a data URL.
 * @returns {Promise<string>} - The original image with red inflammation overlay.
 */
export const applyBlemishFilter = (imageDataUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the ORIGINAL image as the base
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const width = canvas.width;
            const height = canvas.height;
            const radius = 5; // Blur kernel radius

            const getIndex = (x, y) => (y * width + x) * 4;

            const getG = (x, y) => {
                x = Math.max(0, Math.min(width - 1, x));
                y = Math.max(0, Math.min(height - 1, y));
                return data[getIndex(x, y) + 1]; // Green channel
            };

            // Create output as a copy of original
            const outputData = ctx.createImageData(width, height);
            const out = outputData.data;

            // Copy original pixels first
            for (let i = 0; i < data.length; i++) {
                out[i] = data[i];
            }

            // Now scan and overlay red on blemish areas
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = getIndex(x, y);
                    const currentG = data[i + 1];

                    // Local average of Green channel
                    let sum = 0;
                    let count = 0;
                    for (let ky = -radius; ky <= radius; ky++) {
                        for (let kx = -radius; kx <= radius; kx++) {
                            sum += getG(x + kx, y + ky);
                            count++;
                        }
                    }
                    const avgG = sum / count;

                    // How much darker is this pixel than its surroundings?
                    const diff = avgG - currentG;

                    // Threshold: only highlight significant differences
                    if (diff > 8) {
                        // Intensity of the red overlay (stronger diff = more red)
                        const intensity = Math.min(1, (diff - 8) / 25);

                        // Blend: mix original pixel with red based on intensity
                        out[i] = Math.min(255, out[i] + Math.round(180 * intensity));     // Boost Red
                        out[i + 1] = Math.max(0, Math.round(out[i + 1] * (1 - intensity * 0.7))); // Reduce Green
                        out[i + 2] = Math.max(0, Math.round(out[i + 2] * (1 - intensity * 0.7))); // Reduce Blue
                        // Alpha stays 255
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
