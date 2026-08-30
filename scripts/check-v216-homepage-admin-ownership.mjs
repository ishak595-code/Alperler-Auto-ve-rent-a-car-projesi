import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`V216 homepage admin ownership contract failed: ${message}`);
  process.exitCode = 1;
};

const homepageAdmin = read('src/pages/admin/admin-homepage.component.ts');
const plannerCopyAdmin = read('src/pages/admin/admin-homepage-planner-copy.component.ts');
const settingsHub = read('src/pages/admin/admin-site-settings-hub.component.ts');
const publicHome = read('src/pages/home-v71.component.ts');

for (const required of [
  "homeContent['plannerServiceOptions']",
  'plannerServiceOptions.map',
]) {
  if (!homepageAdmin.includes(required)) fail(`canonical homepage editor is missing ${required}`);
}

for (const value of ['individual', 'driver', 'wedding', 'tour']) {
  const pattern = new RegExp(`value\\s*:\\s*['\"]${value}['\"]`);
  if (!pattern.test(homepageAdmin)) fail(`canonical homepage editor is missing service option ${value}`);
}

for (const forbidden of [
  'form.plannerServiceIndividual',
  'form.plannerServiceDriver',
  'form.plannerServiceWedding',
  'form.plannerServiceTour',
  'plannerServiceIndividual:',
  'plannerServiceDriver:',
  'plannerServiceWedding:',
  'plannerServiceTour:',
]) {
  if (plannerCopyAdmin.includes(forbidden)) fail(`secondary planner copy editor still owns ${forbidden}`);
}

for (const required of [
  'form.plannerServiceLabel',
  'plannerServiceLabel:',
  'Ana Sayfa Üst Alanı',
]) {
  if (!plannerCopyAdmin.includes(required)) fail(`secondary planner copy editor is missing ${required}`);
}

for (const required of [
  '<app-admin-homepage-planner-copy />',
  '<app-admin-homepage />',
]) {
  if (!settingsHub.includes(required)) fail(`homepage settings hub is missing ${required}`);
}

if (!publicHome.includes('plannerServiceOptions')) {
  fail('public homepage no longer consumes canonical plannerServiceOptions');
}

if (!process.exitCode) {
  console.log('V216 homepage admin ownership contract passed.');
}
