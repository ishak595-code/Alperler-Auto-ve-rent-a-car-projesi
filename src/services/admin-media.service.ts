import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export interface AdminMediaUploadResult {
  bucket: string;
  objectPath: string;
  publicUrl: string;
}

const HOMEPAGE_BACKGROUND_MAX_WIDTH = 1920;
const HOMEPAGE_BACKGROUND_MAX_HEIGHT = 1280;
const HOMEPAGE_BACKGROUND_TARGET_BYTES = 1_500_000;
const HOMEPAGE_BACKGROUND_QUALITIES = [0.82, 0.74, 0.66, 0.58] as const;

@Injectable({ providedIn: 'root' })
export class AdminMediaService {
  private readonly auth = inject(AuthService);
  private readonly bucket = 'catalog-media';
  private readonly maxImageBytes = 15 * 1024 * 1024;
  private readonly allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

  async uploadHomepageImage(file: File, sectionKey: string, purpose: 'profile' | 'cover' | 'background'): Promise<AdminMediaUploadResult> {
    const prepared = purpose === 'background' ? await this.prepareHomepageBackground(file) : file;
    return this.uploadImage(prepared, 'HOMEPAGE_SECTION', sectionKey, purpose);
  }

  async uploadImage(file: File, entityType: string, entityId: string, purpose = 'image'): Promise<AdminMediaUploadResult> {
    if (!this.allowedImageTypes.has(file.type)) throw new Error('Yalnız JPG, PNG, WEBP veya AVIF görsel yükleyebilirsiniz.');
    if (!file.size || file.size > this.maxImageBytes) throw new Error('Görsel en fazla 15 MB olabilir.');

    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');

    const extension = this.extensionFor(file);
    const safeType = this.cleanSegment(entityType || 'content');
    const safeEntity = this.cleanSegment(entityId || 'draft');
    const safePurpose = this.cleanSegment(purpose || 'image');
    const nonce = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const objectPath = `admin/${safeType}/${safeEntity}/${safePurpose}/${Date.now()}-${nonce}.${extension}`;
    const encodedPath = objectPath.split('/').map((part) => encodeURIComponent(part)).join('/');

    const upload = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}/${encodedPath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        'content-type': file.type,
        'x-upsert': 'false',
        'cache-control': '31536000',
      },
      body: file,
    });
    if (!upload.ok) {
      const payload = await upload.json().catch(() => ({})) as { message?: string; error?: string };
      throw new Error(payload.message || payload.error || `MEDIA_UPLOAD_${upload.status}`);
    }

    const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${this.bucket}/${encodedPath}`;
    try {
      const asset = await fetch('/api/partner?op=media-control-admin', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json',
          'x-request-id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          action: 'REGISTER_MEDIA_ASSET',
          payload: {
            bucket: this.bucket,
            object_path: objectPath,
            media_type: 'IMAGE',
            entity_type: String(entityType || 'CONTENT').slice(0, 80),
            entity_id: String(entityId || 'draft').slice(0, 180),
            alt_text: file.name.slice(0, 180),
            metadata: {
              purpose: safePurpose,
              originalName: file.name.slice(0, 180),
              size: file.size,
              mimeType: file.type,
              optimizedForHomepage: entityType === 'HOMEPAGE_SECTION' && purpose === 'background',
            },
          },
        }),
      });
      const payload = await asset.json().catch(() => ({})) as { ok?: boolean; code?: string };
      if (!asset.ok || payload.ok !== true) throw new Error(payload.code || `MEDIA_ASSET_${asset.status}`);
    } catch (error) {
      await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}/${encodedPath}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      throw error;
    }

    return { bucket: this.bucket, objectPath, publicUrl };
  }

  private async prepareHomepageBackground(file: File): Promise<File> {
    if (!this.allowedImageTypes.has(file.type)) throw new Error('Yalnız JPG, PNG, WEBP veya AVIF görsel yükleyebilirsiniz.');
    if (!file.size || file.size > this.maxImageBytes) throw new Error('Görsel en fazla 15 MB olabilir.');
    if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
      if (file.size <= HOMEPAGE_BACKGROUND_TARGET_BYTES) return file;
      throw new Error('Bu tarayıcı büyük hero görsellerini güvenli biçimde optimize edemiyor. Daha küçük bir görsel yükleyin.');
    }

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error('Hero görseli tarayıcı tarafından okunamadı. JPG, PNG, WEBP veya AVIF dosyasını yeniden seçin.');
    }

    try {
      const scale = Math.min(
        1,
        HOMEPAGE_BACKGROUND_MAX_WIDTH / Math.max(1, bitmap.width),
        HOMEPAGE_BACKGROUND_MAX_HEIGHT / Math.max(1, bitmap.height),
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('HERO_IMAGE_CANVAS_UNAVAILABLE');
      context.drawImage(bitmap, 0, 0, width, height);

      let selected: Blob | null = null;
      for (const quality of HOMEPAGE_BACKGROUND_QUALITIES) {
        const candidate = await this.canvasBlob(canvas, 'image/webp', quality);
        if (!candidate) continue;
        selected = candidate;
        if (candidate.size <= HOMEPAGE_BACKGROUND_TARGET_BYTES) break;
      }
      if (!selected) throw new Error('HERO_IMAGE_ENCODING_FAILED');

      const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'homepage-hero';
      return new File([selected], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
    } catch (error) {
      if (error instanceof Error && !/^HERO_IMAGE_/.test(error.message)) throw error;
      throw new Error('Hero görseli optimize edilemedi. Lütfen farklı bir görsel deneyin.');
    } finally {
      bitmap.close();
    }
  }

  private canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  private extensionFor(file: File): string {
    const byType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
    return byType[file.type] || 'img';
  }

  private cleanSegment(value: string): string {
    return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'content';
  }
}
