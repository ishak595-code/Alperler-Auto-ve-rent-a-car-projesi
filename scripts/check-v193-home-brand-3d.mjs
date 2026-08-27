import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const angular = read('angular.json');
const home = read('src/pages/home-v71.component.ts');
const media = read('src/services/admin-media.service.ts');
const theme = read('src/services/theme.service.ts');
const palette = read('src/prestige-palette-defaults.css');
const cinematic = read('src/v193-cinematic-3d.css');
const manifest = read('public/manifest.json');
const index = read('index.html');

for (const asset of [
  'public/brand/alperler-logo.svg',
  'public/brand/alperler-hero.svg',
  'public/brand/alperler-app-icon.svg',
]) {
  check(exists(asset), `Missing repo-owned brand asset: ${asset}`);
}

check(angular.includes('src/v193-cinematic-3d.css'), 'V193 cinematic CSS is not loaded by Angular.');
check(!/heroImage[^\n]*seoOgImage/.test(home), 'Homepage hero must not fall back to the SEO OG image.');
check(home.includes('home["heroImage"]||""'), 'Homepage hero must remain owned by homeContent.heroImage.');

check(media.includes('HOMEPAGE_BACKGROUND_MAX_WIDTH = 1920'), 'Homepage background width optimization is missing.');
check(media.includes('HOMEPAGE_BACKGROUND_TARGET_BYTES = 1_500_000'), 'Homepage background byte target is missing.');
check(media.includes("'cache-control': '31536000'"), 'Long-lived immutable-style media cache policy is missing.');
check(media.includes("return new File([selected]"), 'Homepage background WebP preparation is missing.');

check(cinematic.includes("url('/brand/alperler-hero.svg')"), 'Repo-owned hero fallback is missing.');
check(cinematic.includes('perspective: 1500px'), 'Hero perspective depth is missing.');
check(/translateZ\(|translate3d\(/.test(cinematic), 'Cinematic layer has no real Z-axis depth.');
check(cinematic.includes('@media (hover: hover) and (pointer: fine)'), 'Desktop precision-pointer 3D interaction gate is missing.');
check(cinematic.includes('(pointer: coarse)'), 'Touch/mobile 3D performance fallback is missing.');
check(cinematic.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion accessibility fallback is missing.');
check(cinematic.includes('body[data-motion="reduced"]'), 'Admin-controlled reduced-motion fallback is missing.');

check(palette.includes("url('/brand/alperler-logo.svg')"), 'Portable navbar logo fallback is missing.');
check(theme.includes("background: '#06080D'"), 'Black premium background default is missing.');
check(theme.includes("brandGold: '#D4AF37'"), 'Gold brand token is missing.');
check(theme.includes("primaryBlue: '#9E1B24'"), 'Red primary brand token is missing.');

check(manifest.includes('"theme_color": "#06080D"'), 'Manifest theme color is not aligned with V193.');
check(manifest.includes('"src": "/brand/alperler-app-icon.svg"'), 'Manifest does not expose repo-owned app icon.');
check(index.includes('<meta name="theme-color" content="#06080D">'), 'Document theme color is not aligned with V193.');
check(index.includes('href="/brand/alperler-app-icon.svg"'), 'Document favicon is not repo-owned V193 icon.');

if (failures.length) {
  console.error(`V193 invariant failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V193 cinematic brand, hero ownership, portability, 3D depth, touch fallback, and reduced-motion invariants passed.');
