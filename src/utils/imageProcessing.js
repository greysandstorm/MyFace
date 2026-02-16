/**
 * Advanced Blemish Detection: High-Pass Texture Filter
 * 
 * Instead of simply averaging channels, this compares each pixel's
 * Green channel value to the LOCAL AVERAGE of its neighbors.
 * 
 * Blemishes (red spots) absorb green light → appear dark in the Green channel.
 * By subtracting the local average, we isolate ONLY the local dark spots
 * (texture/blemishes) and remove the overall skin tone gradient.
 * 
 * Result: White background with dark spots where blemishes are.
 *
 * @param {string} imageDataUrl - The captured selfie as a data URL.
 * @returns {Promise<string>} - The processed image as a data URL.
 */
export const applyBlemishFilter = (imageDataUrl) => {
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
            const radius = 4; // Blur kernel radius

            const getIndex = (x, y) => (y * width + x) * 4;

            // Clamp helper
            const getG = (x, y) => {
                x = Math.max(0, Math.min(width - 1, x));
                y = Math.max(0, Math.min(height - 1, y));
                return data[getIndex(x, y) + 1]; // Green channel
            };

            const outputData = ctx.createImageData(width, height);
            const out = outputData.data;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = getIndex(x, y);
                    const currentG = data[i + 1];

                    // Calculate local average (box blur of Green channel)
                    let sum = 0;
                    let count = 0;
                    for (let ky = -radius; ky <= radius; ky++) {
                        for (let kx = -radius; kx <= radius; kx++) {
                            sum += getG(x + kx, y + ky);
                            count++;
                        }
                    }
                    const avgG = sum / count;

                    // High-pass: how much darker is this pixel than surroundings?
                    let diff = avgG - currentG;

                    // Amplify the difference
                    diff = diff * 4;

                    // Noise gate: ignore very small differences (normal skin texture)
                    if (diff < 10) diff = 0;

                    // Output: white background, dark where blemishes are
                    const val = Math.max(0, Math.min(255, 255 - diff));

                    out[i] = val;       // R
                    out[i + 1] = val;   // G
                    out[i + 2] = val;   // B
                    out[i + 3] = 255;   // Alpha
                }
            }

            ctx.putImageData(outputData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
        img.src = imageDataUrl;
    });
};
