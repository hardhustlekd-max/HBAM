/**
 * Compresses an image Base64 data URL using HTML5 Canvas.
 * Reduces the width/height to fit within the max boundaries and compresses the quality,
 * yielding a compact, web-ready JPEG.
 */
export async function compressImageBase64(
  base64Str: string,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.75
): Promise<string> {
  if (!base64Str || typeof base64Str !== 'string') {
    return '';
  }

  // If it's not a data URL or already a remote URL, return immediately
  if (!base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  return new Promise((resolve) => {
    let settled = false;

    // Fail-safe timeout: never hang more than 1000ms
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(base64Str);
      }
    }, 1000);

    const safeResolve = (result: string) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            safeResolve(base64Str);
            return;
          }

          // Calculate new dimensions while keeping aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Draw to canvas
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Handle transparency with white background for JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Generate compressed JPEG Base64
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            safeResolve(compressedDataUrl || base64Str);
          } else {
            safeResolve(base64Str);
          }
        } catch {
          safeResolve(base64Str);
        }
      };

      img.onerror = () => {
        safeResolve(base64Str);
      };

      img.src = base64Str;

      // If image is already complete synchronously
      if (img.complete && img.naturalWidth > 0) {
        img.onload(new Event('load') as any);
      }
    } catch {
      safeResolve(base64Str);
    }
  });
}

