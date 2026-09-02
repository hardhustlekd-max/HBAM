import { compressImageBase64 } from '../utils/imageCompressor';

/**
 * Uploads an image (File, Blob, or Base64 data URL) to GoDaddy hosting server local storage (/uploads/...).
 * Returns the relative photo URL served directly from GoDaddy host disk.
 * Fallback to compressed Base64 if the server is unreachable.
 */
export async function uploadDocumentPhoto(
  source: string | File | Blob,
  folder: string = 'permits'
): Promise<string> {
  if (!source) return '';

  let base64Data: string = '';
  let rawFile: File | Blob | null = null;

  if (typeof source === 'string') {
    // If it's already a server relative URL or remote URL, return as is without re-uploading
    if (source.startsWith('/uploads/') || source.startsWith('http://') || source.startsWith('https://')) {
      return source;
    }
    base64Data = source;
  } else {
    rawFile = source;
  }

  // Convert File/Blob to Base64 if needed
  if (rawFile && !base64Data) {
    base64Data = await new Promise<string>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve('');
        }
      }, 2000);

      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve((reader.result as string) || '');
          }
        };
        reader.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve('');
          }
        };
        reader.readAsDataURL(rawFile!);
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve('');
        }
      }
    });
  }

  if (!base64Data) {
    return '';
  }

  // Compress the image before uploading (max 800x800, quality 0.75)
  let compressedBase64 = base64Data;
  try {
    compressedBase64 = await compressImageBase64(base64Data, 800, 800, 0.75);
  } catch (compErr) {
    console.warn('Image compression warning, using raw data:', compErr);
  }

  if (typeof window === 'undefined' || !navigator.onLine) {
    return compressedBase64;
  }

  // Upload to GoDaddy hosting local storage via /api/upload endpoint
  try {
    const uploadTask = (async () => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedBase64, folder }),
      });

      if (!response.ok) {
        throw new Error(`Upload server error: ${response.status}`);
      }

      const resData = await response.json();
      return resData.url || compressedBase64;
    })();

    // Race uploadTask against 3000ms timeout
    const result = await Promise.race([
      uploadTask,
      new Promise<string>((resolve) => setTimeout(() => resolve(compressedBase64), 3000)),
    ]);

    return result || compressedBase64;
  } catch (storageErr) {
    console.warn('[GoDaddy File Storage] Server upload notice, falling back to local compressed image:', storageErr);
    return compressedBase64;
  }
}

/**
 * Checks if a string is a saved server storage URL or remote URL rather than a raw Base64 string
 */
export function isRemoteStorageUrl(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('/uploads/') || url.startsWith('http://') || url.startsWith('https://');
}
