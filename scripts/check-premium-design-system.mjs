import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`Premium design guard failed: ${message}`);
  process.exit(1);
};

const angular = JSON.parse(read('angular.json'));
const styles = angular.projects?.app?.architect?.build?.options?.styles || [];
for (const required of [
  'src/premium-design-system.css',
  'src/prestige-palette-defaults.css',
  'src/premium-responsive.css',
]) {
  if (!styles.includes(required)) fail(`${required} is not loaded by Angular.`);
}

const design = read('src/premium-design-system.css');
const prestigeDefaults = read('src/prestige-palette-defaults.css');
const responsive = read('src/premium-responsive.css');
const vehicleCard = read('src/components/vehicle-list-item.component.ts');
const themeService = read('src/services/theme.service.ts');
const appearanceAdmin = read('src/pages/admin/admin-appearance-settings.component.ts');
const siteConfig = read('src/models/site-config.model.ts');

// Structural guard only. It intentionally never counts or inspects catalog records,
// dynamic homepage section counts, campaign counts, vehicle counts, tour counts or blog counts.
// Admin users remain free to add new content and new showcase sections.
const paletteVariables = [
  '--alper-bg',
  '--alper-list',
  '--alper-surface',
  '--alper-card',
  '--alper-elevated',
  '--alper-border',
  '--alper-blue',
  '--alper-blue-light',
  '--alper-gold',
  '--alper-text',
  '--alper-muted',
  '--alper-subtle',
];

for (const variable of paletteVariables) {
  if (!design.includes(variable)) fail(`Shared design system does not reference ${variable}.`);
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const defaultPattern = new RegExp(`${escaped}\\s*:\\s*#[0-9A-Fa-f]{6}`);
  if (!defaultPattern.test(prestigeDefaults)) fail(`Prestige fallback palette does not define a valid HEX value for ${variable}.`);
  if (!themeService.includes(`setProperty('${variable}'`)) fail(`Runtime theme service does not apply ${variable}.`);
}

if (!design.includes('app-rental-results') || !design.includes('app-sales-results')) {
  fail('Rental and sales pages are not both covered by the shared premium system.');
}
if (!design.includes('.filter-sheet') || !design.includes('var(--alper-surface)')) {
  fail('Filter sheets are not tied to the shared surface token.');
}
if (!responsive.includes('grid-template-columns: minmax(0, 1fr) !important')) {
  fail('Narrow-phone vehicle results must collapse to one column.');
}
if (!vehicleCard.includes('badgeTone(car.badge)')) fail('Vehicle badges are not standardized by tone.');
if (!vehicleCard.includes('FIRSAT|İNDİRİM|INDIRIM|KAMPANYA|AVANTAJ')) fail('Gold opportunity/discount badge mapping is missing.');
if (!vehicleCard.includes('YENİ|YENI|POPÜLER|POPULAR')) fail('Blue new/popular badge mapping is missing.');
if (!vehicleCard.includes('cardDescription')) fail('Vehicle cards must include a dynamic description preview.');

if (!siteConfig.includes('PremiumThemePalette') || !siteConfig.includes('premiumPalette?: PremiumThemePalette')) {
  fail('Premium palette is not represented in SiteConfig.');
}

const paletteKeys = [
  'background', 'listBackground', 'surface', 'card', 'elevated', 'border',
  'primaryBlue', 'blueLight', 'brandGold', 'text', 'textMuted', 'textSubtle',
];
for (const key of paletteKeys) {
  if (!appearanceAdmin.includes(`key: '${key}'`)) fail(`Admin appearance panel is missing the ${key} color control.`);
}
for (const setting of ['contentMaxWidth', 'cornerRadius', 'fontScale', 'motionPreference']) {
  if (!appearanceAdmin.includes(setting)) fail(`Admin appearance panel is missing responsive setting ${setting}.`);
}
if (!appearanceAdmin.includes('id="palette-title"') || !appearanceAdmin.includes('class="palette-grid"') || !appearanceAdmin.includes('colorFields')) {
  fail('Admin premium palette section structure is missing.');
}
if (!appearanceAdmin.includes('Geri Yükle') || !appearanceAdmin.includes('resetPremiumPalette()')) {
  fail('Admin premium palette reset action is missing.');
}
if (!appearanceAdmin.includes('preview-wrap') || !appearanceAdmin.includes('Canlı tema ön izlemesi')) {
  fail('Admin live theme preview is missing.');
}

console.log('Premium design system guard passed; admin palette controls, responsive layout and dynamic content growth remain compatible.');
