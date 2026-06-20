/**
 * Client-side image compressor using HTML5 Canvas.
 * Compresses images to JPEG format with a specified quality and max dimension.
 * Reduces transmission payload sizes by up to 90% (e.g. from 5MB down to ~300KB).
 *
 * @param {File} file - Original file uploaded by the user
 * @param {number} maxDimension - Maximum width or height of the compressed image
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {Promise<File>} Compressed File object
 */
export function compressImage(file, maxDimension = 1600, quality = 0.80) {
  return new Promise((resolve) => {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply scale constraints while maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            maxDimension;
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            // Reconstruct File object
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(
              `[ImageCompressor] Compressed "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) to ` +
              `"${compressedFile.name}" (${(compressedFile.size / 1024).toFixed(2)} KB) - Aspect: ${width}x${height}`
            );
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
