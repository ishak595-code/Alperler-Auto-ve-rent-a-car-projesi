import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { console.error(`V234_FEEDBACK_PORTABILITY_FAIL: ${message}`); process.exitCode = 1; };
const requireText = (source, fragment, message) => { if (!source.includes(fragment)) fail(message); };

const feedback = read('src/components/feedback.component.ts');
for (const [fragment, message] of [
  ['aria-modal="true"', 'feedback must remain a real modal dialog'],
  ['id="feedback-dialog"', 'feedback dialog id/focus target is missing'],
  ['position:fixed;inset:0', 'feedback must remain viewport-fixed'],
  ['width:100vw', 'feedback must remain full viewport width'],
  ['height:100dvh', 'feedback must use dynamic viewport height'],
  ['body.style.position="fixed"', 'feedback must lock background scroll without viewport jump'],
  ['body.style.overflow="hidden"', 'feedback must prevent background scroll'],
  ['feedbackModalOpen', 'feedback modal lifecycle marker is missing'],
  ['document:keydown.escape', 'feedback must close on Escape'],
  ['onDialogKeydown', 'feedback focus trap is missing'],
  ['this.uiService.toggleFeedback(false)', 'feedback must close through the existing UiService overlay contract'],
  ['fetch("/api/contact"', 'feedback must submit through the same-origin contact gateway'],
]) requireText(feedback, fragment, message);
if (feedback.includes('backdrop-filter:blur')) fail('feedback must not reintroduce GPU backdrop blur that can shimmer on mobile WebKit');
if (feedback.includes('window.setTimeout(() => this.reset()')) fail('feedback must not reintroduce delayed reset/reopen race');

const footer = read('src/components/customer-footer-v70.component.ts');
requireText(footer, "footer.settings().showFeedback", 'feedback visibility must remain admin/footer-settings controlled');
requireText(footer, 'this.ui.toggleFeedback(true)', 'footer must use the existing UiService feedback-open contract');
requireText(footer, "link.actionType==='FEEDBACK'", 'footer feedback action contract is missing');

const routes = read('src/app.routes.ts');
requireText(routes, "path: 'feedback'", 'admin feedback route is missing');
requireText(routes, "operationsSection: 'messages'", 'admin feedback route must resolve to Operations > Messages');

const adminFeedback = read('src/pages/admin/admin-feedback.component.ts');
requireText(adminFeedback, 'ContactAdminService', 'admin feedback must use canonical contact admin service');
requireText(adminFeedback, 'changeStatus', 'admin feedback status management is missing');
requireText(adminFeedback, 'saveNote', 'admin feedback internal-note management is missing');

const contactAdminService = read('src/services/contact-admin.service.ts');
requireText(contactAdminService, '/api/contact-admin', 'admin feedback must use same-origin contact admin gateway');

const contactApi = read('api/contact.ts');
requireText(contactApi, 'mode==="admin"', 'contact API must preserve admin mode');
requireText(contactApi, '/functions/v1/contact-admin', 'contact API must proxy admin reads/writes to protected Edge Function');

const contactAdminEdge = read('supabase/functions/contact-admin/index.ts');
requireText(contactAdminEdge, 'admin_users?user_id=eq.', 'contact admin Edge Function must verify active admin membership');
requireText(contactAdminEdge, 'contact_messages?select=*', 'contact admin Edge Function must read canonical contact_messages source');

const portableServer = read('server.ts');
for (const [fragment, message] of [
  ['import "dotenv/config"', 'portable Node runtime must load .env when used outside managed hosting'],
  ['["/api/contact-admin",{handler:contactApi,query:{mode:"admin"}}]', 'portable runtime is missing contact-admin alias parity'],
  ['app.get(/^\\/catalog-media\\/.+/', 'portable runtime must preserve catalog-media routing outside Vercel'],
  ['SUPABASE_PROJECT_URL', 'portable catalog media routing must be environment-driven'],
  ['X-Permitted-Cross-Domain-Policies', 'portable runtime security headers are incomplete'],
  ['Cross-Origin-Opener-Policy', 'portable runtime COOP header is missing'],
]) requireText(portableServer, fragment, message);
if (portableServer.includes('https://cdn.tailwindcss.com')) fail('portable runtime CSP must not depend on Tailwind CDN');

const envExample = read('.env.example');
for (const key of ['SUPABASE_PROJECT_URL=', 'SUPABASE_PUBLISHABLE_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=', 'PUBLIC_APP_URL=']) {
  requireText(envExample, key, `.env.example missing portable environment contract ${key}`);
}

if (!fs.existsSync(path.join(root, 'docs/ZIP_HOSTING_HANDOFF_V234.md'))) fail('ZIP/non-Vercel handoff runbook is missing');
if (!fs.existsSync(path.join(root, 'tests/v205/feedback-overlay-v234.spec.ts'))) fail('six-device feedback overlay browser regression is missing');

if (!process.exitCode) console.log('V234 feedback + portability contract OK: full-screen modal, admin ownership, same-origin gateways and non-Vercel runtime parity are protected.');
