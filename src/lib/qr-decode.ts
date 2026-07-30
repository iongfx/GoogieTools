import jsQR from "jsqr";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

const MAX_DECODE_BYTES = 12 * 1024 * 1024;

export type QrDecodeResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

/**
 * Reads a user-uploaded image and returns the text encoded in any QR code found.
 * All work stays in the browser — nothing is uploaded to a server.
 */
export async function decodeQrFromImageFile(file: File): Promise<QrDecodeResult> {
  if (!file) {
    return { ok: false, error: "Choose an image that contains a QR code." };
  }

  if (file.size <= 0) {
    return { ok: false, error: "That file looks empty. Try another image." };
  }

  if (file.size > MAX_DECODE_BYTES) {
    return {
      ok: false,
      error: "Keep the image under 12 MB so it can be decoded in your browser.",
    };
  }

  const type = file.type.toLowerCase();
  if (type && !ALLOWED_TYPES.has(type) && !type.startsWith("image/")) {
    return {
      ok: false,
      error: "Upload a PNG, JPG, or WebP image of a QR code.",
    };
  }

  let objectUrl: string | null = null;

  try {
    objectUrl = URL.createObjectURL(file);
    const image = await loadImage(objectUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) {
      return {
        ok: false,
        error: "Couldn’t read that image. Try a clearer photo or screenshot.",
      };
    }

    // Cap canvas size so very large photos stay responsive.
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const canvasWidth = Math.max(1, Math.round(width * scale));
    const canvasHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return {
        ok: false,
        error: "This browser couldn’t prepare the image for decoding.",
      };
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (!code?.data) {
      return {
        ok: false,
        error:
          "No QR code found in that image. Try a sharper, well-lit photo with the code fully visible.",
      };
    }

    const data = code.data.trim();
    if (!data) {
      return {
        ok: false,
        error: "That QR code didn’t contain any readable text.",
      };
    }

    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: "Couldn’t decode that image. Try another file or a clearer screenshot.",
    };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });
}
