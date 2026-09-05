import { Injectable } from "@angular/core";
import { CatalogMediaService } from "./catalog-media.service";

@Injectable()
export class CatalogMediaHighCapacityService extends CatalogMediaService {
  constructor() {
    super();
    const instance = this as unknown as { validateFile?: (file: File) => void };
    instance.validateFile = (file: File) => {
      const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]);
      if (!allowed.has(file.type)) throw new Error("Yalnız JPEG, PNG, WebP, AVIF, MP4 veya WebM yüklenebilir.");
      if (file.size < 1 || file.size > 200 * 1024 * 1024) throw new Error("Dosya 200 MB sınırını aşıyor.");
    };
  }
}
