import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const json=(file)=>JSON.parse(read(file));
const fail=(message)=>{throw new Error(`V163 security gate: ${message}`);};
const assert=(condition,message)=>{if(!condition)fail(message);};

const pkg=json('package.json');
const angular=json('angular.json');
const vercel=json('vercel.json');
const postcss=json('.postcssrc.json');
const index=read('index.html');
const tailwind=read('src/tailwind.css');
const runtimeEnv=read('public/runtime-env.js');

assert(pkg.devDependencies?.tailwindcss==='4.2.1','Tailwind must be pinned to 4.2.1.');
assert(pkg.devDependencies?.['@tailwindcss/postcss']==='4.2.1','@tailwindcss/postcss must be pinned to 4.2.1.');
assert(pkg.devDependencies?.postcss==='8.5.6','PostCSS must be pinned to 8.5.6.');
assert(!JSON.stringify(pkg).includes('"latest"'),'Package manifest may not use floating latest versions.');
assert(postcss.plugins?.['@tailwindcss/postcss']!==undefined,'Tailwind PostCSS plugin is not configured.');
assert(tailwind.includes('@import "tailwindcss"'),'Local Tailwind entry stylesheet is missing.');
assert(!index.includes('cdn.tailwindcss.com'),'Tailwind Play CDN is forbidden in production.');
assert(!index.includes('<style>'),'Global inline style blocks must stay out of index.html.');
assert(index.includes('src="/runtime-env.js"'),'Runtime environment shim must be a same-origin external script.');
assert(runtimeEnv.includes('NODE_ENV: "production"'),'Runtime environment shim lost its production contract.');

const build=angular.projects?.app?.architect?.build?.options;
assert(build?.security?.autoCsp===true,'Angular autoCsp must be enabled.');
assert(Array.isArray(build?.styles)&&build.styles[0]==='src/tailwind.css','Local Tailwind CSS must be the first global stylesheet.');

const executableInline=[...index.matchAll(/<script(?![^>]*type=["']application\/ld\+json["'])(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .filter((match)=>match[1].trim().length>0);
assert(executableInline.length===0,'Executable inline scripts are forbidden in source index.html.');

const rootHeader=vercel.headers?.find((entry)=>entry.source==='/(.*)');
assert(rootHeader,'Global Vercel security headers are missing.');
const headerMap=Object.fromEntries((rootHeader.headers||[]).map((item)=>[item.key.toLowerCase(),item.value]));
assert(headerMap['strict-transport-security']?.includes('max-age='),'HSTS is missing.');
assert(headerMap['x-content-type-options']==='nosniff','nosniff header is missing.');
assert(headerMap['x-frame-options']==='DENY','X-Frame-Options must deny framing.');
assert(headerMap['cross-origin-opener-policy']==='same-origin-allow-popups','COOP must preserve OAuth popups while isolating the opener.');
assert(headerMap['x-permitted-cross-domain-policies']==='none','Legacy cross-domain policy must be disabled.');
const csp=headerMap['content-security-policy']||'';
for(const required of [
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "connect-src 'self' https://hrztrgjvgdnaurejnsgs.supabase.co wss://hrztrgjvgdnaurejnsgs.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
]) assert(csp.includes(required),`CSP is missing: ${required}`);
assert(!csp.includes('cdn.tailwindcss.com'),'CSP must not trust the Tailwind Play CDN.');

const browserFiles=[];
const collect=(dir)=>{
  for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
    const rel=path.posix.join(dir,entry.name);
    if(entry.isDirectory()) collect(rel);
    else if(/\.(?:ts|tsx|js|mjs|html)$/.test(entry.name)) browserFiles.push(rel);
  }
};
collect('src');
browserFiles.push('index.html','public/runtime-env.js');
for(const file of browserFiles){
  const content=read(file);
  assert(!/sb_secret_/i.test(content),`${file} contains a Supabase secret-key marker.`);
  assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(content),`${file} references a service-role secret.`);
}

const migration=read('supabase/migrations/20260825013000_v163_production_security_hardening.sql');
const migrationNorm=migration.toLowerCase().replace(/\s+/g,' ').trim();
for(const fragment of [
  'revoke execute on function public.admin_set_customer_status(uuid, text) from public, anon',
  'revoke execute on function public.customer_cancel_booking(text) from public, anon',
  'alter function public.sync_vehicle_hourly_fields() set search_path = pg_catalog, public',
  'revoke execute on function public.sync_vehicle_hourly_fields() from public, anon, authenticated',
]) assert(migrationNorm.includes(fragment),`Security migration is missing: ${fragment}`);

const distIndex=path.join(root,'dist','index.html');
if(fs.existsSync(distIndex)){
  const built=fs.readFileSync(distIndex,'utf8');
  assert(!built.includes('cdn.tailwindcss.com'),'Built HTML still contains Tailwind Play CDN.');
  assert(/http-equiv=["']Content-Security-Policy["']/i.test(built),'Angular autoCsp meta policy was not generated.');
  assert(built.includes("'strict-dynamic'"),'Built Angular CSP lost strict-dynamic.');
  const cssFiles=fs.readdirSync(path.join(root,'dist')).filter((name)=>name.endsWith('.css'));
  assert(cssFiles.length>0,'Production build contains no CSS bundle.');
  const css=cssFiles.map((name)=>fs.readFileSync(path.join(root,'dist',name),'utf8')).join('\n');
  assert(css.includes('.bg-slate-50'),'Compiled Tailwind utility CSS is missing from the production bundle.');
}

console.log('V163 production security contract passed.');
