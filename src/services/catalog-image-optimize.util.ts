/**
 * Katalog görsel optimizasyonu — AdminMediaService, CatalogMediaService ve
 * şube yükleme yollarının ortak tarayıcı tarafı sıkıştırması.
 *
 * Hedef: uzun kenar ~1600–1920, WebP (JPEG yedek), ~150–300 KB.
 * GIF animasyonları ve SVG/HEIC zaten media-file.util tarafından reddedilir/atlanır.
 */

export const CATALOG_IMAGE_MAX_LONG_EDGE = 1920;
export const CATALOG_IMAGE_TARGET_BYTES = 250_000;
export const CATALOG_IMAGE_INPUT_MAX_BYTES = 10 * 1024 * 1024;
export const CATALOG_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
/** Depolama kovası tavanı (V246); sıkıştırma sonrası dosyalar bu sınırın çok altında kalır. */
export const CATALOG_STORAGE_BUCKET_MAX_BYTES = 200 * 1024 * 1024;

const IMAGE_QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5] as const;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim() || "catalog-image";
}

/**
 * Katalog görsellerini WebP'ye (veya JPEG yedeğine) indirger.
 * Tarayıcı API'si yoksa ve dosya zaten hedefin altındaysa olduğu gibi döner.
 */
export async function prepareCatalogImage(file: File): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    if (file.size <= CATALOG_IMAGE_TARGET_BYTES) return file;
    throw new Error("Bu tarayıcı büyük katalog görsellerini güvenli biçimde optimize edemiyor. Daha küçük bir görsel yükleyin.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Görsel tarayıcı tarafından okunamadı. JPG, PNG, WEBP veya AVIF dosyasını yeniden seçin.");
  }

  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = longEdge > CATALOG_IMAGE_MAX_LONG_EDGE
      ? CATALOG_IMAGE_MAX_LONG_EDGE / longEdge
      : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    // Zaten küçük ve WebP ise yeniden kodlamayı atla.
    if (
      scale === 1
      && file.type === "image/webp"
      && file.size <= CATALOG_IMAGE_TARGET_BYTES
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("CATALOG_IMAGE_CANVAS_UNAVAILABLE");
    context.drawImage(bitmap, 0, 0, width, height);

    let selected: Blob | null = null;
    let selectedType = "image/webp";
    for (const quality of IMAGE_QUALITIES) {
      const candidate = await canvasBlob(canvas, "image/webp", quality);
      if (!candidate) continue;
      selected = candidate;
      selectedType = "image/webp";
      if (candidate.size <= CATALOG_IMAGE_TARGET_BYTES) break;
    }

    // WebP desteklenmiyorsa veya sonuç hedefin çok üzerindeyse JPEG dene.
    if (!selected || selected.size > CATALOG_IMAGE_TARGET_BYTES * 1.4) {
      for (const quality of IMAGE_QUALITIES) {
        const candidate = await canvasBlob(canvas, "image/jpeg", quality);
        if (!candidate) continue;
        if (!selected || candidate.size < selected.size) {
          selected = candidate;
          selectedType = "image/jpeg";
        }
        if (candidate.size <= CATALOG_IMAGE_TARGET_BYTES) break;
      }
    }

    if (!selected) throw new Error("CATALOG_IMAGE_ENCODING_FAILED");

    // Optimizasyon büyütüyorsa (nadir) orijinali koru.
    if (selected.size >= file.size && scale === 1) return file;

    const extension = selectedType === "image/webp" ? "webp" : "jpg";
    return new File([selected], `${baseName(file)}.${extension}`, {
      type: selectedType,
      lastModified: Date.now(),
    });
  } catch (error) {
    if (error instanceof Error && !/^CATALOG_IMAGE_/.test(error.message) && !/optimize|okunamadı|tarayıcı/i.test(error.message)) {
      throw error;
    }
    throw new Error("Görsel optimize edilemedi. Lütfen farklı bir görsel deneyin.");
  } finally {
    bitmap.close();
  }
}

/** Giriş boyutu / video tavanı — mediaRejectionReason sonrası çağrılır. */
export function catalogUploadSizeRejection(file: File, mediaType: string): string {
  if (!file.size) return "Dosya boş görünüyor.";
  if (mediaType.startsWith("video/")) {
    if (file.size > CATALOG_VIDEO_MAX_BYTES) {
      return `Video en fazla ${Math.round(CATALOG_VIDEO_MAX_BYTES / (1024 * 1024))} MB olabilir. Daha kısa bir klip yükleyin veya önce bir kapak (poster) görseli ekleyin.`;
    }
    return "";
  }
  if (mediaType.startsWith("image/")) {
    if (file.size > CATALOG_IMAGE_INPUT_MAX_BYTES) {
      return `Görsel en fazla ${Math.round(CATALOG_IMAGE_INPUT_MAX_BYTES / (1024 * 1024))} MB olabilir. Daha küçük bir fotoğraf seçin.`;
    }
    return "";
  }
  return "";
}
