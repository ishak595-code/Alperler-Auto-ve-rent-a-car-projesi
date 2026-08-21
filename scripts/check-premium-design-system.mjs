import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`Premium design guard failed: ${message}`);
  process.exit(1);
};

const angular = JSON.parse(read('angular.json'));
const styles = angular.projects?.app?.architect?.build?.options?.styles || [];
for (const required of ['src/premium-design-system.css', 'src/premium-responsive.css']) {
  if (!styles.includes(required)) fail(`${required} is not loaded by Angular.`);
}

const design = read('src/premium-design-system.css');
const responsive = read('src/premium-responsive.css');
const vehicleCard = read('src/components/vehicle-list-item.component.ts');
const salesTemplate = read('src/pages/sales-results.component.html');

const requiredTokens = {
  '--alper-bg: #050A18': 'main background',
  '--alper-list: #080F20': 'list background',
  '--alper-surface: #0B1224': 'surface',
  '--alper-card: #0D1628': 'card',
  '--alper-elevated: #101A2E': 'elevated surface',
  '--alper-border: #24314A': 'border',
  '--alper-blue: #2563EB': 'primary blue',
  '--alper-blue-light: #60A5FA': 'blue highlight',
  '--alper-gold: #EABF35': 'brand gold',
  '--alper-text: #F8FAFC': 'primary text',
  '--alper-muted: #94A3B8': 'muted text',
  '--alper-subtle: #64748B': 'subtle text',
};

for (const [token, label] of Object.entries(requiredTokens)) {
  if (!design.includes(token)) fail(`Missing ${label} token (${token}).`);
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

if (!vehicleCard.includes('badgeTone(car.badge)')) {
  fail('Vehicle badges are not standardized by tone.');
}

if (!vehicleCard.includes('FIRSAT|İNDİRİM|INDIRIM|KAMPANYA|AVANTAJ')) {
  fail('Gold opportunity/discount badge mapping is missing.');
}

if (!vehicleCard.includes('YENİ|YENI|POPÜLER|POPULAR')) {
  fail('Blue new/popular badge mapping is missing.');
}

if (!vehicleCard.includes('cardDescription')) {
  fail('Vehicle cards must include a dynamic description preview.');
}

if (/bg-white|bg-slate-200/.test(salesTemplate)) {
  fail('Sales results must not reintroduce white/light-gray list surfaces.');
}

console.log('Premium design system guard passed.');
