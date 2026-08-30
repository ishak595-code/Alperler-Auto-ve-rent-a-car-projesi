import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const home = read('src/pages/home-v71.component.ts');
const dock = read('src/components/customer-mobile-dock.component.ts');
const admin = read('src/services/homepage-admin.service.ts');
const adminPage = read('src/pages/admin/admin-homepage.component.ts');
const layout = read('src/services/homepage-layout.service.ts');
const mainLayout = read('src/components/main-layout.component.ts');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(!home.includes('@defer (on viewport'), 'Homepage sections must not wait for viewport rendering.');
expect(home.includes('@for (section of managedSections(); track section.sectionKey) {\n        <app-dynamic-home-section'), 'Managed homepage sections must render eagerly and deterministically.');
expect(!mainLayout.includes('@defer (on viewport'), 'Customer prefooter/footer must not depend on viewport defer.');
expect(mainLayout.includes('<app-customer-prefooter-v174></app-customer-prefooter-v174>'), 'Customer prefooter must be eagerly present.');
expect(mainLayout.includes('<app-customer-footer-v70></app-customer-footer-v70>'), 'Customer footer must be eagerly present.');

expect(admin.includes("private defaultMaxItems(type:HomepageSectionType):number{return type==='CAMPAIGN'?3:(type==='VEHICLES'||type==='TOURS'||type==='BLOG'?5:1);}"), 'Manual showcase defaults must remain 5 for vehicles/tours/blog and 3 for campaigns.');
expect(admin.includes('activeCount>0?activeCount'), 'Manual showcase count must follow active admin placements.');
expect(adminPage.includes('async addSelected(section: HomepageSectionRecord)'), 'Admin must keep an explicit add-to-showcase action.');
expect(adminPage.includes('await this.homepage.addPlacement({ sectionKey: section.sectionKey'), 'Admin add action must persist a real homepage placement.');
expect(adminPage.includes("candidatesFor(section: HomepageSectionRecord): Candidate[]"), 'Admin must expose selectable candidates for manual showcases.');
expect(!adminPage.includes('candidatesFor(section: HomepageSectionRecord): Candidate[] { return this.allCandidates(section).slice('), 'Admin candidate list must not impose a fixed five-item cap.');
expect(adminPage.includes('(change)="savePlacement(placement)"'), 'Admin must let operators activate and deactivate existing showcase placements without deleting them.');
expect(adminPage.includes('(click)="movePlacement(section.sectionKey,p,-1)"'), 'Admin must preserve manual showcase ordering controls.');
expect(layout.includes("type HomepageSelectionMode = 'PLACEMENT' | 'LATEST';"), 'Homepage selection mode contract is missing.');
expect(layout.includes("if (mode === 'LATEST') return [];"), 'LATEST must stay separate from manual placements.');
expect(layout.includes("placementDriven ? Math.max(1, manualCount) : storedLimit"), 'Public manual section size must remain placement-driven.');

expect(dock.includes('window.requestAnimationFrame'), 'Mobile dock auto-hide must be requestAnimationFrame throttled.');
expect(dock.includes('Math.abs(delta) < 12'), 'Mobile dock auto-hide must use a hysteresis threshold to prevent jitter.');
expect(dock.includes('navigation.mobileDockAutoHideEnabled()'), 'Mobile dock must honor the admin auto-hide setting.');
expect(dock.includes('dock-auto-hidden'), 'Mobile dock must have a stable animated hidden state.');
expect(dock.includes('this.setAutoHidden(delta > 0 && currentY > 120)'), 'Mobile dock must hide on downward scrolling and reappear on upward scrolling.');

expect(home.includes('overflow-x:clip'), 'Homepage must guard against horizontal overflow.');
expect(home.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr)'), 'Planner grids must use shrink-safe responsive tracks.');
expect(home.includes('overflow-wrap:anywhere'), 'Homepage long text must have an overflow-safe wrapping rule.');
expect(!home.includes('.planner{border:1px solid rgba(148,163,184,.25);border-radius:22px;background:rgba(6,14,29,.94)'), 'Planner must not regress to the scroll-flicker-prone translucent blur surface.');

if (failures.length) {
  console.error('V214 homepage stability contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('V214 homepage stability contract passed.');