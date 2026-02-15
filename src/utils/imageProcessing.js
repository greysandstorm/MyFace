/**
 * Processes an image to highlight blemishes using a "Red Channel Reduction" technique.
 * Theory: Blemishes are red. In a B&W image, if we reduce the contribution of the Red channel, 
 * red things become darker (because their brightness comes from Red).
 * 
 * @param {string} imageDataUrl - The captured selfie.
 * @returns {Promise<string>} - The processed image as a Data URL.
 */
export const applyBlemishFilter = (imageDataUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Standard B&W uses ~ 0.3R + 0.59G + 0.11B
                // We want to REDUCE red sensitivity.
                // Let's rely mostly on Blue and Green.
                // Blemishes (Red) will lack G/B brightness, so they will appear darker.

                // Algorithm: Average of Green and Blue channels.
                let gray = (g + b) / 2;

                // Contrast stretching to make the dark spots darker
                // (Simple linear contrast)
                const contrast = 1.2; // Increase contrast by 20%
                const intercept = 128 * (1 - contrast);
                gray = gray * contrast + intercept;

                // Clamping
                gray = Math.max(0, Math.min(255, gray));

                data[i] = gray;     // R
                data[i + 1] = gray; // G
                data[i + 2] = gray; // B
                // Alpha (data[i+3]) remains unchanged
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
        img.src = imageDataUrl;
    });
};
