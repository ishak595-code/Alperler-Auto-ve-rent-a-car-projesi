import fs from 'node:fs';
import path from 'node:path';

const read=(file)=>fs.readFileSync(file,'utf8');
const exists=(file)=>fs.existsSync(file);
const failures=[];
const fail=(message)=>failures.push(message);
const requireText=(source,token,message)=>{if(!source.includes(token))fail(message);};

const server=read('server.ts');
const vercel=JSON.parse(read('vercel.json'));
const env=read('.env.example');
const pkg=JSON.parse(read('package.json'));
const manifest=JSON.parse(read('supabase/functions/deployment-manifest.v186.json'));
const manifestSlugs=new Set((manifest.functions||[]).filter(item=>!item.retired).map(item=>item.slug));

for(const required of ['Dockerfile','.dockerignore','server.ts','vercel.json','.env.example','supabase/migrations','supabase/functions']){
  if(!exists(required))fail(`portable repository is missing ${required}`);
}
for(const forbidden of ['.vercel/project.json','.env','.env.production','.env.local']){
  if(exists(forbidden))fail(`host/account-local state must not be committed: ${forbidden}`);
}

if(!String(pkg.engines?.node||'').includes('22'))fail('Node 22 runtime contract is missing');
requireText(String(pkg.scripts?.start||''),'server.ts','generic npm start runtime is missing');
requireText(String(pkg.scripts?.build||''),'ng build','production build command is missing');

const apiCoverage=new Map([
  ['api/bookings.ts','["/api/bookings",bookingsApi]'],
  ['api/branch-network.ts','["/api/branch-network",branchNetworkApi]'],
  ['api/branches.ts','["/api/branches",branchesApi]'],
  ['api/catalog.ts','["/api/catalog",catalogApi]'],
  ['api/contact.ts','["/api/contact",contactApi]'],
  ['api/finance/report.ts','["/api/finance/report",financeReportApi]'],
  ['api/partner.ts','["/api/partner",partnerApi]'],
  ['api/payments.ts','["/api/payments",paymentsApi]'],
  ['api/social-preview.ts','["/api/social-preview",socialPreviewApi]'],
  ['api/wallet-cards.ts','["/api/wallet-cards",walletCardsApi]'],
  ['api/robots.ts','app.all("/robots.txt"'],
  ['api/sitemap.ts','app.all("/sitemap.xml"'],
]);

const entryFiles=[];
function walkApi(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('_'))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){walkApi(full);continue;}
    if(entry.isFile()&&entry.name.endsWith('.ts'))entryFiles.push(full.replaceAll('\\','/'));
  }
}
walkApi('api');
for(const file of entryFiles){if(!apiCoverage.has(file))fail(`Vercel/API entrypoint has no declared portable Node route: ${file}`);}
for(const [file,token] of apiCoverage){if(!entryFiles.includes(file))fail(`declared portable API source is missing: ${file}`);else requireText(server,token,`portable Node route missing for ${file}`);}

const aliases=[
  ['/api/contact-admin','/api/contact?mode=admin','["/api/contact-admin",{handler:contactApi,query:{mode:"admin"}}]'],
  ['/api/send-email','/api/contact?mode=email','["/api/send-email",{handler:contactApi,query:{mode:"email"}}]'],
  ['/api/partner-requests','/api/partner?op=requests','["/api/partner-requests",{handler:partnerApi,query:{op:"requests"}}]'],
  ['/api/partner-media','/api/partner?op=media','["/api/partner-media",{handler:partnerApi,query:{op:"media"}}]'],
  ['/api/partner-upload-resume','/api/partner?op=resume','["/api/partner-upload-resume",{handler:partnerApi,query:{op:"resume"}}]'],
  ['/api/payments/create-session','/api/payments?op=create-session','["/api/payments/create-session",{handler:paymentsApi,query:{op:"create-session"}}]'],
  ['/api/payments/paytr-callback','/api/payments?op=paytr-callback','["/api/payments/paytr-callback",{handler:paymentsApi,query:{op:"paytr-callback"}}]'],
  ['/api/integrations/status','/api/bookings?mode=integration-status','["/api/integrations/status",{handler:bookingsApi,query:{mode:"integration-status"}}]'],
  ['/api/rental-availability','/api/bookings?mode=rental-availability','["/api/rental-availability",{handler:bookingsApi,query:{mode:"rental-availability"}}]'],
  ['/api/tour-availability','/api/bookings?mode=tour-availability','["/api/tour-availability",{handler:bookingsApi,query:{mode:"tour-availability"}}]'],
  ['/api/admin-booking-actions','/api/bookings?mode=admin-booking-actions','["/api/admin-booking-actions",{handler:bookingsApi,query:{mode:"admin-booking-actions"}}]'],
];
for(const [source,destination,serverToken] of aliases){
  requireText(server,serverToken,`generic Node alias missing: ${source}`);
  const rewrite=(vercel.rewrites||[]).find(item=>item.source===source);
  if(rewrite?.destination!==destination)fail(`Vercel adapter alias drifted: ${source} -> ${destination}`);
}

for(const token of ['APP_PUBLIC_ORIGIN=','APP_ALLOWED_ORIGINS=','PUBLIC_SITE_URL=','SUPABASE_PROJECT_URL=','SUPABASE_PUBLISHABLE_KEY=','SUPABASE_SERVICE_ROLE_KEY=','PORT=3000']){
  requireText(env,token,`.env.example is missing ${token}`);
}

const docker=read('Dockerfile');
for(const token of ['FROM node:22','npm ci','npm run build','npm ci --omit=dev','COPY --from=build /app/api ./api','COPY --from=build /app/server.ts ./server.ts','CMD ["npm", "start"]']){
  requireText(docker,token,`Docker portability contract missing: ${token}`);
}

const runtimeSources=['api/partner.ts','api/bookings.ts','api/contact.ts','src/services/admin-first-access-v239.service.ts'];
const referencedSlugs=new Set();
for(const file of runtimeSources){
  const source=read(file);
  for(const match of source.matchAll(/edgeFunction:\s*["']([a-z0-9-]+)["']/gi))referencedSlugs.add(match[1]);
  for(const match of source.matchAll(/\/functions\/v1\/([a-z0-9-]+)/gi))referencedSlugs.add(match[1]);
  for(const match of source.matchAll(/supabaseFunctionUrl\(["']([a-z0-9-]+)["']\)/gi))referencedSlugs.add(match[1]);
}
for(const slug of ['booking-gateway-v166','booking-gateway','booking-admin-actions','integration-status','rental-availability','tour-availability-v169','contact-gateway','contact-admin'])referencedSlugs.add(slug);
for(const slug of referencedSlugs){
  if(!manifestSlugs.has(slug))fail(`runtime references Edge Function absent from deployment manifest: ${slug}`);
  if(!exists(`supabase/functions/${slug}/index.ts`))fail(`runtime references Edge Function source absent from repository: ${slug}`);
}

for(const file of ['server.ts','src/supabase.config.ts','api/_lib/supabase-public.ts','api/_lib/public-origin.ts']){
  const source=read(file);
  if(/https:\/\/[^\s"']+\.vercel\.app/i.test(source))fail(`runtime source pins a Vercel deployment hostname: ${file}`);
}

const routes=read('src/app.routes.ts');
const operations=read('src/pages/admin/admin-operations-hub.component.ts');
const branchRequests=read('src/pages/admin/admin-branch-partner-requests.component.ts');
for(const token of ["path: 'branch-partner-requests'","operationsSection: 'branches-requests'"])requireText(routes,token,'admin branch application route is missing');
requireText(operations,"label:'Bayilik Başvuruları'",'admin operations does not expose branch applications');
for(const token of ['Ticari Doğrulama','Notu Kaydet','Şube Alanını Hazırla'])requireText(branchRequests,token,`branch application admin workflow missing: ${token}`);

if(failures.length){
  console.error('V244 host portability and endpoint integrity: FAIL');
  for(const message of failures)console.error(`- ${message}`);
  process.exit(1);
}
console.log(`V244 host portability and endpoint integrity: PASS (${entryFiles.length} API entrypoints, ${referencedSlugs.size} Edge targets verified).`);
