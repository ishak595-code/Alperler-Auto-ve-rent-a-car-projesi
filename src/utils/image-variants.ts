/**
 * V252 — browser-side generation of the fixed R2 width set.
 *
 * R2 cannot resize on delivery, so each upload produces w480/w768/w1080/w1440/w1920 siblings
 * (never upscaled: narrower sources re-encode at their own width so every key exists and
 * srcset never 404s). WebP where the browser can encode it, JPEG otherwise (older Safari);
 * the chosen format is recorded as metadata.r2.variantExt. AVIF is skipped on purpose:
 * canvas AVIF encoding is not available in mainstream browsers yet.
 */
import { R2_IMAGE_WIDTHS } from "./r2-media";

export interface MediaVariantFile { name: string; blob: Blob; contentType: string }
export interface GeneratedImageSet { files: MediaVariantFile[]; variantExt: "webp" | "jpg"; width: number; height: number }

const VARIANT_QUALITY = 0.8;
let webpSupport: Promise<boolean> | null = null;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function supportsWebpEncoding(): Promise<boolean> {
  if (!webpSupport) {
    webpSupport = (async () => {
      if (typeof document === "undefined") return false;
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const blob = await canvasBlob(canvas, "image/webp", 0.8).catch(() => null);
      return blob?.type === "image/webp";
    })();
  }
  return webpSupport;
}

/** Target size for one fixed width, never upscaling. */
export function variantSize(sourceWidth: number, sourceHeight: number, width: number): { width: number; height: number } {
  const targetWidth = Math.max(1, Math.min(width, Math.round(sourceWidth)));
  const targetHeight = Math.max(1, Math.round((sourceHeight * targetWidth) / Math.max(1, sourceWidth)));
  return { width: targetWidth, height: targetHeight };
}

async function encodeSet(source: CanvasImageSource, sourceWidth: number, sourceHeight: number): Promise<GeneratedImageSet> {
  const webp = await supportsWebpEncoding();
  const variantExt: "webp" | "jpg" = webp ? "webp" : "jpg";
  const contentType = webp ? "image/webp" : "image/jpeg";
  const files: MediaVariantFile[] = [];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: webp });
  if (!context) throw new Error("MEDIA_VARIANT_CANVAS_UNAVAILABLE");
  for (const width of R2_IMAGE_WIDTHS) {
    const size = variantSize(sourceWidth, sourceHeight, width);
    canvas.width = size.width;
    canvas.height = size.height;
    if (!webp) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, size.width, size.height);
    const blob = await canvasBlob(canvas, contentType, VARIANT_QUALITY);
    if (!blob || blob.type !== contentType) throw new Error("MEDIA_VARIANT_ENCODING_FAILED");
    files.push({ name: `w${width}.${variantExt}`, blob, contentType });
  }
  return { files, variantExt, width: Math.round(sourceWidth), height: Math.round(sourceHeight) };
}

/** Fixed-width variants of an image file/blob. */
export async function generateImageVariants(source: Blob): Promise<GeneratedImageSet> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") throw new Error("MEDIA_VARIANT_UNSUPPORTED");
  const bitmap = await createImageBitmap(source);
  try {
    return await encodeSet(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/**
 * Poster still for a video (frame at ~10% / max 1 s), returned as the same fixed width set.
 * If the browser cannot decode the clip, a neutral dark 16:9 poster is used so the upload
 * still succeeds (the admin can replace the poster later).
 */
export async function generateVideoPosterVariants(file: Blob): Promise<GeneratedImageSet> {
  if (typeof document === "undefined") throw new Error("MEDIA_VARIANT_UNSUPPORTED");
  const frame = await captureVideoFrame(file).catch(() => null);
  if (frame) return encodeSet(frame, frame.width, frame.height);
  const fallback = document.createElement("canvas");
  fallback.width = 1920;
  fallback.height = 1080;
  const context = fallback.getContext("2d");
  if (!context) throw new Error("MEDIA_VARIANT_CANVAS_UNAVAILABLE");
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, fallback.width, fallback.height);
  return encodeSet(fallback, fallback.width, fallback.height);
}

function captureVideoFrame(file: Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const timer = setTimeout(() => finish(new Error("VIDEO_POSTER_TIMEOUT")), 15_000);
    const finish = (error?: Error, canvas?: HTMLCanvasElement) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (error || !canvas) reject(error || new Error("VIDEO_POSTER_FAILED"));
      else resolve(canvas);
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => finish(new Error("VIDEO_DECODE_FAILED"));
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(1, Math.max(0, duration * 0.1));
    };
    video.onseeked = () => {
      if (!video.videoWidth || !video.videoHeight) return finish(new Error("VIDEO_DIMENSIONS_MISSING"));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) return finish(new Error("MEDIA_VARIANT_CANVAS_UNAVAILABLE"));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      finish(undefined, canvas);
    };
    video.src = url;
  });
}
