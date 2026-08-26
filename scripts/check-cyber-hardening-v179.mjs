import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const read=(file)=>fs.readFileSync(file,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(`V179 cyber hardening invariant failed: ${message}`);};
const all=(content,needles,label)=>{for(const needle of needles)assert(content.includes(needle),`${label} missing ${needle}`);};

const robots=read('api/robots.ts');
const aiAgents=[
  'GPTBot','OAI-SearchBot','ChatGPT-User','OAI-AdsBot','ClaudeBot','Claude-SearchBot','Claude-User',
  'Google-Extended','CCBot','PerplexityBot','Perplexity-User','Applebot-Extended','Bytespider','Amazonbot',
  'meta-externalagent','meta-externalfetcher','cohere-ai',
];
all(robots,aiAgents,'AI crawler deny-list');
all(robots,["aiAgents.map((agent)=>`User-agent: ${agent}\\nDisallow: /\\n`)","url.searchParams.get('block')==='ai'",'status:403',"'x-robots-tag':'noindex, nofollow, noarchive, nosnippet, noimageindex'"],'robots hard block');
assert(!robots.includes('User-agent: OAI-SearchBot\\nAllow: /'),'OAI-SearchBot must not be explicitly allowed');
assert(!robots.includes('User-agent: ChatGPT-User\\nAllow: /'),'ChatGPT-User must not be explicitly allowed');

const vercelText=read('vercel.json');
const vercel=JSON.parse(vercelText);
const aiRewrite=(vercel.rewrites||[]).find((rule)=>rule.destination==='/api/robots?block=ai');
assert(aiRewrite,'known AI agents must be edge-routed to the 403 endpoint');
const aiUa=String(aiRewrite?.has?.find((condition)=>condition.type==='header'&&condition.key==='user-agent')?.value||'');
all(aiUa,aiAgents,'Vercel AI user-agent edge rule');

const globalHeaders=vercel.headers?.find((rule)=>rule.source==='/(.*)')?.headers||[];
const header=(key)=>globalHeaders.find((item)=>item.key===key)?.value||'';
assert(header('Strict-Transport-Security')==='max-age=31536000','HSTS must remain enabled');
assert(header('X-Content-Type-Options')==='nosniff','MIME sniffing must remain disabled');
assert(header('X-Frame-Options')==='DENY','framing must remain denied');
assert(header('X-DNS-Prefetch-Control')==='off','DNS prefetch must remain disabled');
assert(header('Cross-Origin-Opener-Policy')==='same-origin-allow-popups','COOP must isolate the browsing context without breaking OAuth popups');
assert(header('Origin-Agent-Cluster')==='?1','origin-keyed process isolation must remain requested');
const csp=header('Content-Security-Policy');
all(csp,["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self'","script-src-attr 'none'",'upgrade-insecure-requests'],'CSP');

for(const route of ['/admin/:path*','/branch-portal/:path*','/track-car/:path*','/booking-checkout/:path*','/api/:path*']){
  const rule=vercel.headers?.find((item)=>item.source===route);
  assert(rule,`${route} protection headers must exist`);
  const values=Object.fromEntries((rule.headers||[]).map((item)=>[item.key,item.value]));
  assert(String(values['X-Robots-Tag']||'').includes('noindex'),`${route} must stay noindex`);
  assert(values['Cache-Control']==='no-store',`${route} must stay no-store`);
}

const angular=JSON.parse(read('angular.json'));
const production=angular?.projects?.app?.architect?.build?.configurations?.production||{};
assert(production.optimization===true,'production optimization must be explicit');
assert(production.sourceMap===false,'production source maps must be disabled');
assert(production.extractLicenses===true,'production license extraction must be explicit');
assert(production.outputHashing==='all','production output hashing must remain enabled');

const tracked=execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
const forbiddenEnv=/^\.env(?:\.|$)/;
for(const file of tracked){
  const base=path.basename(file);
  if(forbiddenEnv.test(base)&&base!=='.env.example')throw new Error(`V179 cyber hardening invariant failed: tracked secret environment file ${file}`);
}

function walk(root,out=[]){
  if(!fs.existsSync(root))return out;
  const stat=fs.statSync(root);
  if(stat.isFile()){out.push(root);return out;}
  for(const name of fs.readdirSync(root)){
    const target=path.join(root,name);
    const s=fs.statSync(target);
    if(s.isDirectory())walk(target,out);
    else if(/\.(?:ts|tsx|js|mjs|cjs|json|html|css|md|txt|yml|yaml)$/.test(name))out.push(target);
  }
  return out;
}

const browserFiles=[...walk('src'),...walk('public')];
const browserForbidden=[
  'SUPABASE_'+'SERVICE_ROLE_KEY',
  'sb_'+'secret_',
  '-----BEGIN '+'PRIVATE KEY-----',
  'sk_'+'live_',
  'rk_'+'live_',
];
for(const file of browserFiles){
  const content=read(file);
  for(const marker of browserForbidden)assert(!content.includes(marker),`${file} exposes forbidden browser secret marker ${marker}`);
}

// Repository-wide checks look for credential-shaped VALUES, not documentation or
// security tests that intentionally mention a provider's harmless key prefix.
const repositorySecretPatterns=[
  {name:'Supabase secret key',pattern:new RegExp('sb_'+'secret_[A-Za-z0-9._-]{12,}','g')},
  {name:'Stripe-style live secret',pattern:new RegExp('sk_'+'live_[A-Za-z0-9]{12,}','g')},
  {name:'Stripe-style restricted live secret',pattern:new RegExp('rk_'+'live_[A-Za-z0-9]{12,}','g')},
  {name:'private key material',pattern:new RegExp('-----BEGIN '+'(?:RSA |EC |OPENSSH )?PRIVATE KEY-----\\s+[A-Za-z0-9+/=\\r\\n]{100,}','g')},
];
for(const file of tracked){
  if(file==='scripts/check-cyber-hardening-v179.mjs'||!fs.existsSync(file)||fs.statSync(file).isDirectory())continue;
  if(!/\.(?:ts|tsx|js|mjs|cjs|json|html|css|sql|md|txt|yml|yaml)$/.test(file))continue;
  const content=read(file);
  for(const check of repositorySecretPatterns){
    check.pattern.lastIndex=0;
    assert(!check.pattern.test(content),`${file} contains credential-shaped ${check.name}`);
  }
}

const apiFunctions=fs.readdirSync('api',{withFileTypes:true}).filter((entry)=>entry.isFile()&&/\.ts$/.test(entry.name));
assert(apiFunctions.length<=12,`Vercel function budget exceeded: ${apiFunctions.length}/12`);

const removed='alperrentacar'+'.online';
for(const root of ['src','api','supabase','public']){
  for(const file of walk(root))assert(!read(file).includes(removed),`retired domain returned in ${file}`);
}
assert(!vercelText.includes(removed),'retired domain returned in vercel.json');

if(fs.existsSync('dist')){
  const sourceMaps=[];
  const stack=['dist'];
  while(stack.length){
    const current=stack.pop();
    const stat=fs.statSync(current);
    if(stat.isDirectory())for(const name of fs.readdirSync(current))stack.push(path.join(current,name));
    else if(current.endsWith('.map'))sourceMaps.push(current);
  }
  assert(sourceMaps.length===0,`production build emitted source maps: ${sourceMaps.join(', ')}`);
}

console.log('V179 cyber hardening, AI crawler denial, secret hygiene, browser isolation and production source-map invariants are satisfied.');
