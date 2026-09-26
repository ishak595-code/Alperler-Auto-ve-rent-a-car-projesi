import { Directive, computed, input } from "@angular/core";
import { DEFAULT_CARD_SIZES, responsiveSrcset } from "../utils/responsive-media";

/**
 * V252 — adds `srcset`/`sizes` to an <img> when its URL is one of OUR responsive media URLs
 * (Cloudinary fixed-width transformations or R2 pre-generated WebP siblings). Other URLs
 * (legacy Supabase Storage, external, local assets) get no srcset, so nothing can 404.
 *
 *   <img [src]="url" [appResponsiveImg]="url" appResponsiveSizes="100vw" loading="lazy" />
 */
@Directive({
  selector: "img[appResponsiveImg]",
  standalone: true,
  host: {
    "[attr.srcset]": "srcset() || null",
    "[attr.sizes]": "srcset() ? appResponsiveSizes() : null",
  },
})
export class ResponsiveImageDirective {
  readonly appResponsiveImg = input<string | null | undefined>("");
  readonly appResponsiveSizes = input<string>(DEFAULT_CARD_SIZES);
  readonly srcset = computed(() => responsiveSrcset(this.appResponsiveImg() || ""));
}
