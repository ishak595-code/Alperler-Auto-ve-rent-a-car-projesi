from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
import re

from PIL import Image, ImageOps

ASSETS: dict[str, list[str]] = {
    "1001": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz%20C%20200%20%28W206%2C%202023%29%20%2854708506199%29.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz%20C-Class%20%28W206%2C%20rear%29.jpg?width=1600",
    ],
    "1002": [
        "https://upload.wikimedia.org/wikipedia/commons/7/7f/Mercedes-Benz_Vito_W447_Facelift_Sanming_02_2022-11-14.jpg",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz%20Vito%20W447%20Facelift%20Sanming%2001%202022-11-14.jpg?width=1600",
    ],
    "1003": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen%20Amarok%20Mk2%20Auto%20Zuerich%202023%201X7A1356.jpg?width=1600",
    ],
    "1004": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault_Megane_IV_Sedan_1X7A5848.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault%20Megane%20IV%20Sedan%201X7A5849.jpg?width=1600",
    ],
    "1005": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen%20Passat%20B8%20%282019%29%20IMG%202431.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen%20Passat%20B8%20%282019%29%20IMG%202432.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Passat%20B8%20Cockpit.jpg?width=1600",
    ],
    "1006": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW%20G20%20320i%20M%20Sport%20Black%20Sapphire%20Metallic%20%283%29.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW%20320i%20M%20Sport%20%28G20%29%20rear.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW_G20_(2022)_1X7A6120.jpg?width=1600",
    ],
    "1007": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ford_Focus_MK4_sedan_001.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/2018%20Ford%20Focus%20sedan%20%28rear%29.jpg?width=1600",
    ],
    "2001": [
        "https://upload.wikimedia.org/wikipedia/commons/d/dd/Audi_A3_Sportback_35_TFSI_%282022%29_%2852722207714%29.jpg",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/AUDI%20A3%20SPORTBACK%20%28Typ%208Y%29%20China%20%282%29.jpg?width=1600",
    ],
    "2002": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault_Megane_IV_Sedan_1X7A5848.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault%20Megane%20IV%20Sedan%201X7A5847.jpg?width=1600",
    ],
    "2003": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot_3008_facelift.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/2021%20Peugeot%203008%20Allure%20%28Rear%29.jpg?width=1600",
    ],
    "2004": [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20HiLux%20Invincible%2C%20WAW%281%29.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20Hilux%204x4%20V%20Conquest%202023%20%2813%29.jpg?width=1600",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20Hilux%204x4%20V%20Conquest%202023%20%2814%29.jpg?width=1600",
    ],
}


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str | Path, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")
    print("patched", path)


def download_assets() -> None:
    user_agent = "AlperlerAuto/1.0 (catalog asset migration; contact repository owner)"
    created = 0
    for vehicle_id, urls in ASSETS.items():
        folder = Path("public/media/vehicles") / vehicle_id
        folder.mkdir(parents=True, exist_ok=True)
        for index, url in enumerate(urls, 1):
            target = folder / f"{index:02d}.webp"
            request = Request(url, headers={"User-Agent": user_agent, "Accept": "image/*"})
            with urlopen(request, timeout=90) as response:
                raw = response.read(25 * 1024 * 1024 + 1)
            if not raw or len(raw) > 25 * 1024 * 1024:
                raise RuntimeError(f"invalid download size for {vehicle_id}/{index}: {len(raw)}")
            with Image.open(BytesIO(raw)) as source:
                image = ImageOps.exif_transpose(source)
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGB")
                image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                image.save(target, "WEBP", quality=84, method=6, optimize=True)
            if target.stat().st_size < 20_000:
                raise RuntimeError(f"optimized image unexpectedly small: {target}")
            print("saved", target, target.stat().st_size)
            created += 1
    if created != 25:
        raise RuntimeError(f"expected 25 vehicle images, created {created}")


def patch_mock_data() -> None:
    path = "src/services/mock-data.ts"
    text = read(path)
    counts = {int(key): len(value) for key, value in ASSETS.items()}
    for vehicle_id, count in counts.items():
        pattern = re.compile(r"(\{\n\s*id:\s*" + str(vehicle_id) + r",.*?\n\s*\},)", re.S)
        match = pattern.search(text)
        if not match:
            raise RuntimeError(f"mock-data vehicle block not found: {vehicle_id}")
        block = match.group(1)
        local = [f"/media/vehicles/{vehicle_id}/{i:02d}.webp" for i in range(1, count + 1)]
        block, changed = re.subn(r"image:\s*['\"][^'\"]+['\"]", f"image: '{local[0]}'", block, count=1)
        if changed != 1:
            raise RuntimeError(f"mock-data image field not found: {vehicle_id}")
        images_literal = "images: [\n" + "\n".join(
            f"      '{item}'{',' if i < len(local)-1 else ''}" for i, item in enumerate(local)
        ) + "\n    ]"
        block, changed = re.subn(r"images:\s*\[.*?\]", images_literal, block, count=1, flags=re.S)
        if changed == 0:
            block = block.replace(f"image: '{local[0]}',", f"image: '{local[0]}',\n    {images_literal},", 1)
        text = text[:match.start()] + block + text[match.end():]
    write(path, text)


def patch_admin_media() -> None:
    path = "src/pages/admin/admin-catalog-editor.component.ts"
    text = read(path).replace("  CatalogMediaKind,\n", "")
    external_ui = '''          <div class="mt-4 grid grid-cols-2 gap-2">
            <select [(ngModel)]="externalKind" class="min-h-11 rounded-xl border border-slate-200 px-2 text-xs font-bold"><option value="IMAGE">Dış görsel</option><option value="VIDEO">Dış video</option></select>
            <input [(ngModel)]="externalUrl" type="url" placeholder="https://…" class="min-h-11 rounded-xl border border-slate-200 px-3 text-xs" />
            <input [(ngModel)]="externalSource" placeholder="Kaynak adı" class="min-h-11 rounded-xl border border-slate-200 px-3 text-xs" />
            <input [(ngModel)]="externalAttribution" placeholder="Atıf / lisans sahibi" class="min-h-11 rounded-xl border border-slate-200 px-3 text-xs" />
            <button type="button" (click)="addExternalMedia(entityType,id)" [disabled]="!externalUrl.trim() || uploading()" class="col-span-2 min-h-11 rounded-xl bg-slate-900 px-4 text-xs font-black text-white disabled:opacity-40">Kaynaklı Medyayı Ekle</button>
          </div>
'''
    if external_ui not in text:
        raise RuntimeError("admin external media UI block not found")
    text = text.replace(external_ui, '''          <p class="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">Medya yalnız dosya yükleyerek eklenir. Yeni görseller doğrudan Alperler Auto medya deposunda tutulur; dış bağlantıya bağımlı kalmaz.</p>\n''')
    text = text.replace(
        '            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" class="sr-only" (change)="uploadFiles($event, entityType, id)" />',
        '            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" class="sr-only" aria-label="Fotoğraf veya video dosyaları seç" (change)="uploadFiles($event, entityType, id)" />',
    )
    text = text.replace('  externalUrl = "";\n  externalSource = "";\n  externalAttribution = "";\n  externalKind: CatalogMediaKind = "IMAGE";\n', '')
    text, changed = re.subn(
        r'\n  async addExternalMedia\(entityType: "VEHICLE" \| "TOUR", id: string\): Promise<void> \{.*?\n  \}\n\n  async makeCover',
        '\n\n  async makeCover', text, count=1, flags=re.S,
    )
    if changed != 1:
        raise RuntimeError("admin addExternalMedia method not found")
    write(path, text)


def patch_catalog_media_service() -> None:
    path = "src/services/catalog-media.service.ts"
    text = read(path)
    text, changed = re.subn(r'\nexport interface ExternalMediaInput \{.*?\n\}\n', '\n', text, count=1, flags=re.S)
    if changed != 1:
        raise RuntimeError("ExternalMediaInput not found")
    text, changed = re.subn(
        r'\n  async addExternal\(input: ExternalMediaInput\): Promise<CatalogMediaItem> \{.*?\n  \}\n\n  async update',
        '\n\n  async update', text, count=1, flags=re.S,
    )
    if changed != 1:
        raise RuntimeError("addExternal not found")
    text, changed = re.subn(
        r'\n  private async externalDuplicateExists\(.*?\n  \}\n\n  private async uploadStandard',
        '\n\n  private async uploadStandard', text, count=1, flags=re.S,
    )
    if changed != 1:
        raise RuntimeError("externalDuplicateExists not found")
    old = '''    const url = row.external_url || (row.storage_bucket && row.object_path
      ? `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodeURIComponent(row.storage_bucket)}/${row.object_path.split("/").map(encodeURIComponent).join("/")}` : "");'''
    new = '''    const localPath = typeof row.metadata?.["localPath"] === "string" ? String(row.metadata["localPath"]) : "";
    const url = localPath.startsWith("/media/")
      ? localPath
      : row.external_url || (row.storage_bucket && row.object_path
        ? `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodeURIComponent(row.storage_bucket)}/${row.object_path.split("/").map(encodeURIComponent).join("/")}` : "");'''
    if old not in text:
        raise RuntimeError("catalog media fromRow URL block not found")
    write(path, text.replace(old, new))


def patch_public_media_service() -> None:
    path = "src/services/public-catalog-media.service.ts"
    text = read(path)
    text = text.replace('  is_cover?: boolean | null;\n}', '  is_cover?: boolean | null;\n  metadata?: Record<string, unknown> | null;\n}')
    text = text.replace(
        'external_url,poster_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover&',
        'external_url,poster_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,metadata&',
    )
    text = text.replace(
        'const url = this.resolveUrl(row.external_url, row.storage_bucket, row.object_path);',
        'const url = this.resolveUrl(row.external_url, row.storage_bucket, row.object_path, row.metadata, Boolean(row.vehicle_id));',
    )
    old = '''  private resolveUrl(
    externalUrl?: string | null,
    storageBucket?: string | null,
    objectPath?: string | null,
  ): string {
    if (externalUrl?.startsWith("https://")) return this.proxyExternalUrl(externalUrl);
    if (!storageBucket || !objectPath) return "";
    const encodedBucket = encodeURIComponent(storageBucket);
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;
  }'''
    new = '''  private resolveUrl(
    externalUrl?: string | null,
    storageBucket?: string | null,
    objectPath?: string | null,
    metadata?: Record<string, unknown> | null,
    vehicleOwned = false,
  ): string {
    const localPath = typeof metadata?.["localPath"] === "string" ? String(metadata["localPath"]) : "";
    if (localPath.startsWith("/media/")) return localPath;
    if (!vehicleOwned && externalUrl?.startsWith("https://")) return this.proxyExternalUrl(externalUrl);
    if (!storageBucket || !objectPath) return "";
    const encodedBucket = encodeURIComponent(storageBucket);
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;
  }'''
    if old not in text:
        raise RuntimeError("public media resolveUrl block not found")
    write(path, text.replace(old, new))


def add_regression_guard() -> None:
    Path("scripts").mkdir(exist_ok=True)
    write("scripts/check-vehicle-media.mjs", '''import fs from "node:fs";\n\nconst mock = fs.readFileSync("src/services/mock-data.ts", "utf8");\nconst ids = [1001,1002,1003,1004,1005,1006,1007,2001,2002,2003,2004];\nconst failures = [];\nfor (const id of ids) {\n  const start = mock.indexOf(`id: ${id},`);\n  if (start < 0) { failures.push(`vehicle ${id} missing from fallback inventory`); continue; }\n  const next = mock.indexOf("\\n  },", start);\n  const block = mock.slice(start, next > start ? next : mock.length);\n  if (/https?:\\/\\//i.test(block)) failures.push(`vehicle ${id} fallback still contains an external URL`);\n  if (!block.includes(`/media/vehicles/${id}/01.webp`)) failures.push(`vehicle ${id} does not use canonical local cover`);\n}\nconst admin = fs.readFileSync("src/pages/admin/admin-catalog-editor.component.ts", "utf8");\nconst service = fs.readFileSync("src/services/catalog-media.service.ts", "utf8");\nfor (const forbidden of ["externalUrl", "addExternalMedia", "Kaynaklı Medyayı Ekle", "Dış görsel", "Dış video"]) {\n  if (admin.includes(forbidden)) failures.push(`admin media authoring still contains ${forbidden}`);\n}\nif (/async\\s+addExternal\\s*\\(/.test(service)) failures.push("catalog media service still exposes addExternal()");\nif (failures.length) { console.error(failures.join("\\n")); process.exit(1); }\nconsole.log("Vehicle media guard passed: 11 fallback vehicles are local-only and admin URL authoring is disabled.");\n''')


if __name__ == "__main__":
    download_assets()
    patch_mock_data()
    patch_admin_media()
    patch_catalog_media_service()
    patch_public_media_service()
    add_regression_guard()
