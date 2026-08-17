import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export interface AdminMediaUploadResult {
  bucket: string;
  objectPath: string;
  publicUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AdminMediaService {
  private readonly auth = inject(AuthService);
  private readonly bucket = 'catalog-media';
  private readonly maxImageBytes = 15 * 1024 * 1024;
  private readonly allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

  async uploadHomepageImage(file: File, sectionKey: string, purpose: 'profile' | 'cover' | 'background'): Promise<AdminMediaUploadResult> {
    return this.uploadImage(file, 'HOMEPAGE_SECTION', sectionKey, purpose);
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
        'cache-control': '3600',
      },
      body: file,
    });
    if (!upload.ok) {
      const payload = await upload.json().catch(() => ({})) as { message?: string; error?: string };
      throw new Error(payload.message || payload.error || `MEDIA_UPLOAD_${upload.status}`);
    }

    const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${this.bucket}/${encodedPath}`;
    const asset = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/media_assets`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        bucket: this.bucket,
        object_path: objectPath,
        media_type: 'IMAGE',
        entity_type: String(entityType || 'CONTENT').slice(0, 80),
        entity_id: String(entityId || 'draft').slice(0, 180),
        alt_text: file.name.slice(0, 180),
        is_public: true,
        metadata: {
          purpose: safePurpose,
          originalName: file.name.slice(0, 180),
          size: file.size,
          mimeType: file.type,
        },
      }),
    });

    if (!asset.ok) {
      await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}/${encodedPath}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      const payload = await asset.json().catch(() => ({})) as { message?: string; code?: string };
      throw new Error(payload.message || payload.code || `MEDIA_ASSET_${asset.status}`);
    }

    return { bucket: this.bucket, objectPath, publicUrl };
  }

  private extensionFor(file: File): string {
    const byType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
    return byType[file.type] || 'img';
  }

  private cleanSegment(value: string): string {
    return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'content';
  }
}
