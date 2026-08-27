import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(`V194_HOME_JANK_FAIL: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

const admin = read('src/pages/admin/admin-homepage.component.ts');
const cinematic = read('src/v193-cinematic-3d.css');
const worker = read('public/service-worker.js');
const v191 = read('scripts/check-v191-responsive-runtime.mjs');

const saveStart = admin.indexOf('async saveTopArea(): Promise<void>');
const saveEnd = admin.indexOf('async onHeroImageSelected', saveStart);
assert(saveStart >= 0 && saveEnd > saveStart, 'saveTopArea method boundaries are missing');
const saveBody = admin.slice(saveStart, saveEnd);
assert(!saveBody.includes('refreshCloudCatalog'), 'saving hero/planner config must not reload the full public catalog');

const refreshStart = admin.indexOf('async refresh(): Promise<void>');
const refreshEnd = admin.indexOf('async saveTopArea', refreshStart);
assert(refreshStart >= 0 && refreshEnd > refreshStart, 'admin refresh method boundaries are missing');
const refreshBody = admin.slice(refreshStart, refreshEnd);
assert(refreshBody.includes('refreshCloudCatalog(true)'), 'explicit admin showcase refresh must retain catalog candidate refresh');

assert(worker.includes("const RELEASE = 'v194-home-runtime-jank';"), 'service worker cache generation must rotate for V194');
assert(!v191.includes("worker.includes(\"const RELEASE = 'v191-responsive-runtime';\")"), 'V191 regression guard must not freeze future PWA cache generations');
assert(v191.includes('releaseMatch = worker.match'), 'V191 guard must validate a versioned release generically');

const coarseStart = cinematic.indexOf('@media (max-width: 767px), (pointer: coarse)');
const coarseEnd = cinematic.indexOf('@media (prefers-reduced-motion: reduce)', coarseStart);
assert(coarseStart >= 0 && coarseEnd > coarseStart, 'touch/mobile performance block is missing');
const coarse = cinematic.slice(coarseStart, coarseEnd);
for (const token of [
  'backdrop-filter: none !important',
  'perspective: none !important',
  'transform: none !important',
  'transform-style: flat !important',
  'backface-visibility: visible !important',
]) {
  assert(coarse.includes(token), `touch/mobile performance block is missing ${token}`);
}
assert(!coarse.includes('transform: translateZ(0)'), 'touch cards must not force compositor layers with translateZ(0)');
assert(cinematic.includes('perspective: 1500px'), 'desktop cinematic perspective must remain intact');
assert(cinematic.includes('@media (hover: hover) and (pointer: fine)'), 'desktop precision-pointer 3D gate must remain intact');

assert(cinematic.includes('app-dynamic-home-section .home-section.theme-brand'), 'brand theme runtime override is missing');
assert(cinematic.includes('linear-gradient(145deg, #06080D, #171D26 58%, #720B12)'), 'brand theme must use the premium black/graphite/red identity');
assert(admin.includes("value: 'brand', label: 'Alperler Auto', preview: 'linear-gradient(145deg,#06080D,#171D26 58%,#720B12)'"), 'admin brand preview must match runtime brand identity');

console.log('V194 homepage jank guard passed: config saves are isolated, PWA cache rotates, mobile compositing is flattened, desktop 3D is preserved, and brand theme ownership is aligned.');
