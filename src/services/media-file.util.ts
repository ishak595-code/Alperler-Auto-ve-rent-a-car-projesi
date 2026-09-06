/**
 * Medya dosyası kuralları — tüm yükleme yüzeyleri için tek kaynak.
 *
 * İlke: telefon fotoğrafı/videoyu nasıl çektiyse öyle yüklenir; çözünürlük veya
 * boyut sınırı yok (depolama kovasının kendi tavanı hariç). Tarayıcının hiç
 * gösteremeyeceği biçimler (HEIC/HEIF) sessizce bozuk görsel olarak vitrine
 * düşmesin diye açık bir açıklamayla reddedilir.
 */

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif",
  gif: "image/gif", bmp: "image/bmp", heic: "image/heic", heif: "image/heif", svg: "image/svg+xml",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska",
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif", "image/bmp": "bmp",
  "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp",
  "video/x-matroska": "mkv",
};

/** Bazı Android dosya seçiciler `file.type` boş verir; uzantıdan tamamlanır. */
export function resolveMediaType(file: File): string {
  const declared = String(file.type || "").toLowerCase().trim();
  if (declared && declared !== "application/octet-stream") return declared;
  const extension = file.name.toLowerCase().split(".").pop() || "";
  return TYPE_BY_EXTENSION[extension] || declared;
}

export function mediaExtension(type: string, file?: File): string {
  const known = EXTENSION_BY_TYPE[type];
  if (known) return known;
  const fromName = file?.name.toLowerCase().split(".").pop() || "";
  return /^[a-z0-9]{2,5}$/.test(fromName) ? fromName : "bin";
}

export function isImageType(type: string): boolean { return type.startsWith("image/"); }
export function isVideoType(type: string): boolean { return type.startsWith("video/"); }

/**
 * Yüklemeye izin verilir mi? Dönen metin boşsa izinli; doluysa kullanıcıya
 * gösterilecek Türkçe neden.
 */
export function mediaRejectionReason(file: File, options: { video?: boolean } = {}): string {
  const type = resolveMediaType(file);
  if (file.size < 1) return "Dosya boş görünüyor.";
  if (type === "image/heic" || type === "image/heif") {
    return "HEIC/HEIF fotoğraflar tarayıcıda görüntülenemediği için yayınlanamaz. Telefon kamera ayarlarında 'En uyumlu (JPEG)' formatını seçin ya da fotoğrafı JPEG olarak paylaşıp tekrar yükleyin.";
  }
  if (type === "image/svg+xml") return "SVG dosyaları güvenlik nedeniyle katalog medyası olarak kabul edilmez.";
  if (isImageType(type)) return "";
  if (isVideoType(type)) return options.video === false ? "Bu alana yalnız fotoğraf yüklenebilir." : "";
  return "Yalnız fotoğraf veya video dosyası yüklenebilir. Seçilen dosya türü tanınmadı.";
}

/** Supabase Storage yanıtını, gerçek nedeni koruyarak Türkçe bir cümleye çevirir. */
export function describeStorageError(status: number, payload: unknown, fallback = "Medya yüklenemedi"): string {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const message = String(record["message"] || record["error"] || record["statusCode"] || "").trim();
  const lower = message.toLowerCase();
  if (status === 401) return "Yönetici oturumu doğrulanamadı. Çıkış yapıp yeniden giriş yapın.";
  if (lower.includes("row-level security") || lower.includes("row level security") || status === 403) {
    return `Depolama yazma izni veritabanı tarafından reddedildi (RLS). Yönetici kaydınızın aktif ve içerik yetkili olduğundan emin olun. Depolama mesajı: ${message || `HTTP ${status}`}`;
  }
  if (lower.includes("mime") || lower.includes("content type") || lower.includes("not supported")) {
    return `Depolama kovası bu dosya türünü kabul etmiyor (kova ayarı 'allowed_mime_types'). Depolama mesajı: ${message}`;
  }
  if (lower.includes("exceeded") || lower.includes("too large") || status === 413) {
    return `Dosya depolama kovasının boyut tavanını aşıyor. Depolama mesajı: ${message || `HTTP ${status}`}`;
  }
  if (lower.includes("already exists") || status === 409) return "Aynı adla bir dosya zaten var. Yeniden deneyin.";
  return `${fallback} (HTTP ${status})${message ? `: ${message}` : ""}`;
}
