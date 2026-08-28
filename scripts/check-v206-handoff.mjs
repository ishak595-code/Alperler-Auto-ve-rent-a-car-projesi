import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const failures = [];
const fail = (message) => failures.push(message);
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) fail(message);
};

const requiredDocs = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/DEVELOPER_HANDOFF_V206.md',
  'docs/DESIGN_SYSTEM_3D_V206.md',
  'docs/DEPLOYMENT_PORTABILITY_V206.md',
  'docs/PLATFORM_HARDENING_V206.md',
  'docs/V206_CHANGELOG.md',
  'docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md',
  'docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md',
  '.editorconfig',
  '.nvmrc',
];
for (const relative of requiredDocs) if (!exists(relative)) fail(`required handoff file missing: ${relative}`);

const pkg = JSON.parse(read('package.json'));
if (!String(pkg.engines?.node || '').includes('22')) fail('package.json must declare Node 22 compatibility');
if (!String(pkg.scripts?.['typecheck:api'] || '').includes('tsconfig.api.json')) fail('typecheck:api script is missing');
const handoffScript = String(pkg.scripts?.['verify:handoff'] || '');
for (const needle of [
  'check-v206-handoff.mjs',
  'check-portability-v186.mjs',
  'check-v203-canonical-runtime-integrity.mjs',
  'check-v205-responsive-prestige.mjs',
  'design:premium',
  'pwa:installability',
  'a11y:buttons',
  'a11y:dates',
  'media:vehicles',
  'vercel:functions',
  'security:v165',
  'typecheck:api',
  'npm run build',
]) requireText(handoffScript, needle, `verify:handoff must include ${needle}`);
if (!read('.nvmrc').trim().startsWith('22')) fail('.nvmrc must pin the Node 22 line');

const angular = JSON.parse(read('angular.json'));
const styles = angular.projects?.app?.architect?.build?.options?.styles || [];
const expectedStyleOrder = [
  'src/tailwind.css',
  'src/base-shell.css',
  'src/mobile-target-fixes.css',
  'src/runtime-stability.css',
  'src/premium-design-system.css',
  'src/prestige-palette-defaults.css',
  'src/premium-responsive.css',
  'src/v193-cinematic-3d.css',
  'src/device-experience.css',
];
if (JSON.stringify(styles) !== JSON.stringify(expectedStyleOrder)) {
  fail(`global stylesheet ownership/order changed. Expected: ${expectedStyleOrder.join(' -> ')}`);
}
if (styles.at(-1) !== 'src/device-experience.css') fail('device-experience.css must remain the final global device-policy layer');

const palette = read('src/prestige-palette-defaults.css');
const theme = read('src/services/theme.service.ts');
const premiumDefaults = [
  ['--alper-bg: #06080D', "background: '#06080D'"],
  ['--alper-list: #090C12', "listBackground: '#090C12'"],
  ['--alper-surface: #0D1118', "surface: '#0D1118'"],
  ['--alper-card: #11161E', "card: '#11161E'"],
  ['--alper-elevated: #171D26', "elevated: '#171D26'"],
  ['--alper-border: #303846', "border: '#303846'"],
  ['--alper-blue: #9E1B24', "primaryBlue: '#9E1B24'"],
  ['--alper-blue-light: #E15A62', "blueLight: '#E15A62'"],
  ['--alper-gold: #D4AF37', "brandGold: '#D4AF37'"],
  ['--alper-text: #F8F6F1', "text: '#F8F6F1'"],
  ['--alper-muted: #B8B4AA', "textMuted: '#B8B4AA'"],
  ['--alper-subtle: #81858A', "textSubtle: '#81858A'"],
];
for (const [cssNeedle, tsNeedle] of premiumDefaults) {
  requireText(palette, cssNeedle, `prestige fallback palette drifted: ${cssNeedle}`);
  requireText(theme, tsNeedle, `ThemeService premium default drifted: ${tsNeedle}`);
}
for (const alias of [
  '--alper-accent: var(--alper-blue)',
  '--alper-accent-light: var(--alper-blue-light)',
  '--alper-brand-gold: var(--alper-gold)',
]) requireText(palette, alias, `semantic prestige alias missing: ${alias}`);

const cinematic = read('src/v193-cinematic-3d.css');
for (const needle of [
  'perspective: 1500px',
  'transform-style: preserve-3d',
  '@media (hover: hover) and (pointer: fine)',
  '@media (max-width: 767px), (pointer: coarse)',
  'perspective: none !important',
  '@media (prefers-reduced-motion: reduce)',
  'body[data-motion="reduced"]',
  "url('/brand/alperler-hero.svg')",
]) requireText(cinematic, needle, `cinematic 3D/accessibility contract missing: ${needle}`);
if (pkg.dependencies?.three || pkg.devDependencies?.three) fail('Three.js must not be introduced without an explicit measured architecture migration');

const device = read('src/device-experience.css');
for (const needle of [
  '(max-width:639px) and (pointer:coarse)',
  '(max-width:950px) and (max-height:500px) and (pointer:coarse)',
  'app-home-v71 .planner { order: 5',
  'app-home-v71 .trust-row { order: 6',
]) requireText(device, needle, `device experience contract missing: ${needle}`);

const routes = read('src/app.routes.ts');
for (const needle of [
  "path: 'fleet/:id'",
  'RentalDetailShellComponent',
  "path: 'sales/:id'",
  'SaleDetailShellComponent',
  "path: 'tour/:id'",
  'TourDetailShellComponent',
  "path: 'list-your-car'",
  "path: 'branch-partner'",
  "path: 'account'",
]) requireText(routes, needle, `canonical route ownership missing: ${needle}`);

const readme = read('README.md');
for (const needle of [
  'docs/DEVELOPER_HANDOFF_V206.md',
  'docs/DESIGN_SYSTEM_3D_V206.md',
  'docs/DEPLOYMENT_PORTABILITY_V206.md',
  'docs/PLATFORM_HARDENING_V206.md',
  'npm run verify:handoff',
]) requireText(readme, needle, `README start-here contract missing: ${needle}`);

const editor = read('.editorconfig');
for (const needle of ['charset = utf-8', 'end_of_line = lf', 'insert_final_newline = true']) {
  requireText(editor, needle, `.editorconfig portability rule missing: ${needle}`);
}

if (failures.length) {
  console.error('V206 developer handoff integrity: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V206 developer handoff integrity: PASS');
console.log('Canonical docs, Node/editor portability, route ownership, premium palette, cinematic 3D, reduced-motion and cross-device stylesheet ownership are aligned.');
