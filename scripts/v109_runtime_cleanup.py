from __future__ import annotations

from pathlib import Path
import re

PROJECT = "https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/"
MEDIA = {
    1001: [("aa9de081-aa39-4200-a903-9dc2257e7a0b", 1, "7c1276ad-4615-46e9-8530-6cf485ec1db3"), ("aa9de081-aa39-4200-a903-9dc2257e7a0b", 2, "a1d97d3b-a235-47f8-9967-3aa59e4327ce")],
    1002: [("16fcb05c-4b4b-4008-920f-b9abf0a7d9ec", 1, "a1111111-1111-4111-8111-111111111111"), ("16fcb05c-4b4b-4008-920f-b9abf0a7d9ec", 2, "24d89d5d-f2eb-4fb8-b4fc-1a9b68664eb3")],
    1003: [("01c95ee1-6e6e-455e-9309-fffbaa1c60ea", 1, "cd8c06e0-d5b6-4424-b049-192866cfd389"), ("01c95ee1-6e6e-455e-9309-fffbaa1c60ea", 2, "76eb75ed-677c-4323-908a-4d2bcd73dedd")],
    1004: [("90f029e8-8a8f-4fa6-aca8-f9d7c17c0a5a", 1, "43cb06a2-3c4d-4bba-bdb0-c3ece7ccfb9b"), ("90f029e8-8a8f-4fa6-aca8-f9d7c17c0a5a", 2, "01290bf3-439b-4cce-a75e-7a9916a81ab7")],
    1005: [("efdd5ada-f11a-4684-999d-984dd9740ff6", 1, "5f0c7f6a-505b-4f30-99cf-b62335e9b738"), ("efdd5ada-f11a-4684-999d-984dd9740ff6", 2, "9f2dfb02-0850-407a-8b3b-2a54b04efe8d"), ("efdd5ada-f11a-4684-999d-984dd9740ff6", 3, "0dd39bbd-8a79-4f5d-9f49-c62556b4c995")],
    1006: [("529bff5d-3f6c-4d12-9f3e-8da84a5f3579", 1, "9a92c1f0-6038-426a-b52b-5ac96e733e2e"), ("529bff5d-3f6c-4d12-9f3e-8da84a5f3579", 2, "2deac001-032c-4bbc-9aff-0cb81101b9a6"), ("529bff5d-3f6c-4d12-9f3e-8da84a5f3579", 3, "7d5c6537-66bf-48c7-8f0f-2b2c0b6c3ae6")],
    1007: [("f48f8dd1-f361-4a82-8d55-43848cdd79ba", 1, "1c4ed9b8-ab9a-4915-a8e9-4224df726735"), ("f48f8dd1-f361-4a82-8d55-43848cdd79ba", 2, "fa938e1c-adb7-42d2-9358-a86d2ff698d5")],
    2001: [("59278f92-2a37-4aa8-bea4-a886b8459535", 1, "a2222222-2222-4222-8222-222222222222"), ("59278f92-2a37-4aa8-bea4-a886b8459535", 2, "e9d5749c-8cd9-41ab-97c4-ea6923cc83ff")],
    2002: [("64460f16-b018-4e86-9448-e4b872352f8d", 1, "90344845-0317-455d-b668-d029d9df7e48"), ("64460f16-b018-4e86-9448-e4b872352f8d", 2, "a4fc12c9-9e59-4f29-830e-d7f6d0c54474")],
    2003: [("d9c97b76-0b3d-4ff3-9818-106ed6676161", 1, "92b2fd70-e9f1-4b67-9da8-5df8eef77151"), ("d9c97b76-0b3d-4ff3-9818-106ed6676161", 2, "789c9f4b-e433-461b-b9d7-b554a657349c")],
    2004: [("e46ca951-2aac-4dfc-87ee-ac0da0942fe3", 1, "e98662f8-a9cf-4b9c-bcf4-0cd2b5da547a"), ("e46ca951-2aac-4dfc-87ee-ac0da0942fe3", 20, "c95ab30f-6635-4480-a967-68cd6775a6cd"), ("e46ca951-2aac-4dfc-87ee-ac0da0942fe3", 21, "b8a3bde4-c542-4e38-a1b9-aaf0d9e47846")],
}


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str | Path, text: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text, encoding="utf-8")
    print("patched", path)


def media_url(vehicle_id: str, order: int, media_id: str) -> str:
    return f"{PROJECT}vehicle/{vehicle_id}/v109-{order:02d}-{media_id}.jpg"


def patch_mock_data() -> None:
    path = "src/services/mock-data.ts"
    text = read(path)
    for legacy_id, media in MEDIA.items():
        pattern = re.compile(r"(\{\n\s*id:\s*" + str(legacy_id) + r",.*?\n\s*\},)", re.S)
        match = pattern.search(text)
        if not match:
            raise RuntimeError(f"vehicle {legacy_id} block missing")
        block = match.group(1)
        urls = [media_url(*item) for item in media]
        block, changed = re.subn(r"image:\s*['\"][^'\"]+['\"]", f"image: '{urls[0]}'", block, count=1)
        if changed != 1:
            raise RuntimeError(f"vehicle {legacy_id} image field missing")
        images_literal = "images: [\n" + "\n".join(f"      '{url}'{',' if i < len(urls)-1 else ''}" for i, url in enumerate(urls)) + "\n    ]"
        block, changed = re.subn(r"images:\s*\[.*?\]", images_literal, block, count=1, flags=re.S)
        if changed == 0:
            block = block.replace(f"image: '{urls[0]}',", f"image: '{urls[0]}',\n    {images_literal},", 1)
        text = text[:match.start()] + block + text[match.end():]
    write(path, text)


def patch_admin_media() -> None:
    path = "src/pages/admin/admin-catalog-editor.component.ts"
    text = read(path).replace("  CatalogMediaKind,\n", "")
    text, changed = re.subn(
        r'\n\s*<div class="mt-4 grid grid-cols-2 gap-2">\s*<select \[\(ngModel\)\]="externalKind".*?</div>',
        '\n          <p class="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">Medya yalnız dosya yükleyerek eklenir. Yeni dosyalar doğrudan Alperler Auto medya deposuna kaydedilir; dış URL yapıştırma kullanılmaz.</p>',
        text, count=1, flags=re.S,
    )
    if changed != 1:
        raise RuntimeError("external media UI not found")
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
        raise RuntimeError("addExternalMedia method not found")
    write(path, text)


def patch_catalog_media_service() -> None:
    path = "src/services/catalog-media.service.ts"
    text = read(path)
    text, n1 = re.subn(r'\nexport interface ExternalMediaInput \{.*?\n\}\n', '\n', text, count=1, flags=re.S)
    text, n2 = re.subn(r'\n  async addExternal\(input: ExternalMediaInput\): Promise<CatalogMediaItem> \{.*?\n  \}\n\n  async update', '\n\n  async update', text, count=1, flags=re.S)
    text, n3 = re.subn(r'\n  private async externalDuplicateExists\(.*?\n  \}\n\n  private async uploadStandard', '\n\n  private async uploadStandard', text, count=1, flags=re.S)
    if (n1, n2, n3) != (1, 1, 1):
        raise RuntimeError(f"external media service cleanup mismatch {(n1,n2,n3)}")
    write(path, text)


def patch_public_media_service() -> None:
    path = "src/services/public-catalog-media.service.ts"
    text = read(path)
    text = text.replace(
        'const url = this.resolveUrl(row.external_url, row.storage_bucket, row.object_path);',
        'const url = this.resolveUrl(row.external_url, row.storage_bucket, row.object_path, Boolean(row.vehicle_id));',
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
    vehicleOwned = false,
  ): string {
    // Vehicle media is file-backed only. External proxy support is retained solely
    // for older tour content until those records are migrated separately.
    if (!vehicleOwned && externalUrl?.startsWith("https://")) return this.proxyExternalUrl(externalUrl);
    if (!storageBucket || !objectPath) return "";
    const encodedBucket = encodeURIComponent(storageBucket);
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;
  }'''
    if old not in text:
        raise RuntimeError("public media resolveUrl block missing")
    write(path, text.replace(old, new))


def write_date_component() -> None:
    write("src/components/accessible-native-date.component.ts", '''import { Component, EventEmitter, Input, Output } from "@angular/core";\nimport { MatIconModule } from "@angular/material/icon";\n\nlet nextDateControlId = 0;\n\n@Component({\n  selector: "app-accessible-native-date",\n  standalone: true,\n  imports: [MatIconModule],\n  template: `\n    <label class="date-label" [for]="inputId">{{ label }}</label>\n    <div class="date-shell">\n      <input\n        #dateInput\n        [id]="inputId"\n        type="date"\n        [value]="value"\n        [min]="min"\n        [max]="max"\n        [disabled]="disabled"\n        [attr.aria-label]="label"\n        (input)="emitInput($event)"\n      />\n      <button\n        type="button"\n        class="picker-button"\n        [disabled]="disabled"\n        [attr.aria-label]="label + ' takvimini aç'"\n        (click)="openPicker(dateInput)"\n      >\n        <mat-icon aria-hidden="true">calendar_month</mat-icon>\n      </button>\n    </div>\n  `,\n  styles: [`\n    :host{display:block;min-width:0}.date-label{display:block;margin-bottom:.28rem;color:var(--date-label,#b9c3d2);font-size:.61rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-shell{display:grid;grid-template-columns:minmax(0,1fr) 48px;overflow:hidden;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a)}input{width:100%;min-width:0;min-height:47px;border:0;background:transparent;padding:0 .72rem;color:var(--date-color,#fff);font:750 .78rem/1.2 ui-sans-serif,system-ui,sans-serif;outline:none;color-scheme:dark}.picker-button{display:grid;min-width:48px;min-height:47px;place-items:center;border:0;border-left:1px solid var(--date-border,rgba(148,163,184,.24));background:rgba(37,99,235,.14);color:#93c5fd}.picker-button:focus-visible,input:focus{outline:2px solid #60a5fa;outline-offset:-2px}.picker-button:disabled,input:disabled{opacity:.55}input::-webkit-calendar-picker-indicator{display:none;-webkit-appearance:none}mat-icon{width:20px;height:20px;font-size:20px}\n  `],\n})\nexport class AccessibleNativeDateComponent {\n  @Input({ required: true }) label = "Tarih";\n  @Input() value = "";\n  @Input() min = "";\n  @Input() max = "";\n  @Input() disabled = false;\n  @Output() readonly valueChange = new EventEmitter<string>();\n  readonly inputId = `accessible-date-${++nextDateControlId}`;\n\n  emitInput(event: Event): void {\n    this.valueChange.emit((event.target as HTMLInputElement).value);\n  }\n\n  openPicker(input: HTMLInputElement): void {\n    if (this.disabled) return;\n    input.focus();\n    const nativeInput = input as HTMLInputElement & { showPicker?: () => void };\n    try {\n      if (typeof nativeInput.showPicker === "function") nativeInput.showPicker();\n      else input.click();\n    } catch {\n      input.click();\n    }\n  }\n}\n''')


def patch_home_dates() -> None:
    path = "src/pages/home-v71.component.ts"
    text = read(path)
    if 'AccessibleNativeDateComponent' not in text:
        anchor = 'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";\n'
        text = text.replace(anchor, anchor + 'import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";\n')
        text = text.replace('VehicleListItemComponent, DynamicHomeSectionComponent]', 'VehicleListItemComponent, DynamicHomeSectionComponent, AccessibleNativeDateComponent]')
    pattern = re.compile(r'''              <div class="date-grid">\s*<label class="field">\s*<span>\{\{ serviceType === 'tour' \? 'Tur tarihi' : 'Alış tarihi' \}\}</span>\s*<input type="date".*?</label>\s*@if \(serviceType !== 'tour'\) \{\s*<label class="field">\s*<span>İade tarihi</span>\s*<input type="date".*?</label>\s*\}\s*</div>''', re.S)
    replacement = '''              <div class="date-grid">\n                <app-accessible-native-date\n                  [label]="serviceType === 'tour' ? 'Tur tarihi' : 'Alış tarihi'"\n                  [value]="startDate"\n                  [min]="today"\n                  (valueChange)="onStartDateChanged($event)"\n                />\n                @if (serviceType !== 'tour') {\n                  <app-accessible-native-date\n                    label="İade tarihi"\n                    [value]="endDate"\n                    [min]="startDate || today"\n                    (valueChange)="endDate = $event; clearPlannerError()"\n                  />\n                }\n              </div>'''
    text, changed = pattern.subn(replacement, text, count=1)
    if changed != 1:
        raise RuntimeError("home native date block not found")
    write(path, text)


def patch_booking_dates() -> None:
    path = "src/pages/booking-checkout.component.ts"
    text = read(path)
    if 'AccessibleNativeDateComponent' not in text:
        anchor = 'import { MatIconModule } from "@angular/material/icon";\n'
        text = text.replace(anchor, anchor + 'import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";\n')
        text = text.replace('imports: [CommonModule, FormsModule, MatIconModule],', 'imports: [CommonModule, FormsModule, MatIconModule, AccessibleNativeDateComponent],')
    start = re.compile(r'''\s*<label for="booking-start-date" class="block">\s*<span.*?>Alış Tarihi</span>\s*<input id="booking-start-date" type="date".*?/?>\s*</label>''', re.S)
    end = re.compile(r'''\s*<label for="booking-end-date" class="block">\s*<span.*?>İade Tarihi</span>\s*<input id="booking-end-date" type="date".*?/?>\s*</label>''', re.S)
    text, a = start.subn('''\n                <app-accessible-native-date label="Alış Tarihi" [value]="startDate" [min]="today" (valueChange)="setStartDate($event)" />''', text, count=1)
    text, b = end.subn('''\n                <app-accessible-native-date label="İade Tarihi" [value]="endDate" [min]="startDate || today" (valueChange)="setEndDate($event)" />''', text, count=1)
    if (a, b) != (1, 1):
        raise RuntimeError(f"booking date blocks not found {(a,b)}")
    write(path, text)


def write_guards() -> None:
    write("scripts/check-vehicle-media.mjs", '''import fs from "node:fs";\nconst mock = fs.readFileSync("src/services/mock-data.ts", "utf8");\nconst admin = fs.readFileSync("src/pages/admin/admin-catalog-editor.component.ts", "utf8");\nconst service = fs.readFileSync("src/services/catalog-media.service.ts", "utf8");\nconst ids = [1001,1002,1003,1004,1005,1006,1007,2001,2002,2003,2004];\nconst failures = [];\nfor (const id of ids) {\n  const start = mock.indexOf(`id: ${id},`); const end = mock.indexOf("\\n  },", start); const block = mock.slice(start, end > start ? end : mock.length);\n  if (start < 0) failures.push(`fallback vehicle ${id} missing`);\n  if (/wikimedia|unsplash|commons\\./i.test(block)) failures.push(`fallback vehicle ${id} still uses third-party media`);\n  if (!block.includes("hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/vehicle/")) failures.push(`fallback vehicle ${id} is not file-backed by Alperler Storage`);\n}\nfor (const token of ["externalUrl", "addExternalMedia", "Kaynaklı Medyayı Ekle", "Dış görsel", "Dış video"]) if (admin.includes(token)) failures.push(`admin still exposes ${token}`);\nif (/async\\s+addExternal\\s*\\(/.test(service)) failures.push("CatalogMediaService still exposes addExternal()");\nif (failures.length) { console.error(failures.join("\\n")); process.exit(1); }\nconsole.log("Vehicle media guard passed: 11 rental/sale fallback records are Alperler Storage backed and URL authoring is disabled.");\n''')
    write("scripts/check-accessible-buttons.mjs", '''import fs from "node:fs";\nimport path from "node:path";\n\nconst reportOnly = process.argv.includes("--report-only");\nconst issues = [];\nfunction walk(dir) { for (const entry of fs.readdirSync(dir, {withFileTypes:true})) { const full=path.join(dir,entry.name); if (entry.isDirectory()) walk(full); else if (/\\.(ts|html)$/.test(entry.name)) audit(full); } }\nfunction audit(file) {\n  const source=fs.readFileSync(file,"utf8"); const re=/<button\\b([^>]*)>([\\s\\S]*?)<\\/button>/gi; let match;\n  while ((match=re.exec(source))) {\n    const attrs=match[1]; let body=match[2];\n    if (/aria-label(?:ledby)?\\s*=|\\[attr\\.aria-label(?:ledby)?\\]\\s*=/.test(attrs)) continue;\n    body=body.replace(/<mat-icon\\b[^>]*>[\\s\\S]*?<\\/mat-icon>/gi,"").replace(/<svg\\b[\\s\\S]*?<\\/svg>/gi,"").replace(/<[^>]+>/g," ").replace(/\{\{[\\s\\S]*?\}\}/g," dynamic ").replace(/@[a-z]+[^{}]*\{/gi," ").replace(/\}/g," ").replace(/&nbsp;/g," ").trim();\n    if (body) continue;\n    const line=source.slice(0,match.index).split("\\n").length; issues.push(`${file}:${line}: icon-only button has no aria-label/aria-labelledby`);\n  }\n}\nwalk("src");\nfs.writeFileSync("scripts/v109-unlabeled-buttons.txt", issues.length ? issues.join("\\n")+"\\n" : "No unlabeled icon-only buttons found.\\n");\nif (issues.length) { console.error(issues.join("\\n")); if (!reportOnly) process.exit(1); } else console.log("Accessible button guard passed.");\n''')


def patch_package_scripts() -> None:
    path = "package.json"
    text = read(path)
    if '"a11y:buttons"' not in text:
        text = text.replace('    "lint": "tsc --noEmit",', '    "lint": "tsc --noEmit",\n    "a11y:buttons": "node scripts/check-accessible-buttons.mjs",\n    "media:vehicles": "node scripts/check-vehicle-media.mjs",')
    write(path, text)


if __name__ == "__main__":
    patch_mock_data()
    patch_admin_media()
    patch_catalog_media_service()
    patch_public_media_service()
    write_date_component()
    patch_home_dates()
    patch_booking_dates()
    write_guards()
    patch_package_scripts()
