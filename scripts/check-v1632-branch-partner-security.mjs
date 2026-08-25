import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(`Branch partner invariant failed: ${message}`);};
const all=(content,needles,label)=>{for(const needle of needles)assert(content.includes(needle),`${label} missing ${needle}`);};

const client=read('src/services/branch-partner.service.ts');
assert(/private readonly endpoint\s*=\s*["']\/api\/partner\?op=branch-partner["']/.test(client),'branch partner client must use same-origin /api/partner BFF');
all(client,['x-request-id','authorization:`Bearer ${token}`'],'branch partner client');
assert(!client.includes('/functions/v1/branch-partner-'),'browser must not call branch partner Edge directly');
assert(!client.includes('SUPABASE_PUBLISHABLE_KEY'),'same-origin BFF must own the Supabase boundary');

const api=read('api/partner.ts');
all(api,['guardOrigin','originDecision','clientIp','x-request-id','x-upstream-request-id','PAYLOAD_TOO_LARGE','operation === "branch-partner"'],'consolidated partner BFF');
assert(api.includes('branch-partner-v164')||api.includes('branch-partner-gateway'),'BFF must route to an approved branch partner Edge function');
assert(!fs.existsSync('api/branch-partner.ts'),'Vercel function budget requires branch partner to reuse api/partner.ts');

const boundary=read('supabase/migrations/20260825102000_v1632_branch_partner_boundary.sql');
all(boundary,['revoke all on table public.branch_partner_requests from anon, authenticated','grant all on table public.branch_partner_requests to service_role','enable row level security'],'branch partner database boundary');
const deny=read('supabase/migrations/20260825103000_v1632_branch_partner_explicit_deny.sql');
all(deny,['branch_partner_requests_anon_deny','branch_partner_requests_authenticated_deny','as restrictive','using (false)','with check (false)'],'branch partner explicit deny policy');

const edgePath=fs.existsSync('supabase/functions/branch-partner-v164/index.ts')?'supabase/functions/branch-partner-v164/index.ts':'supabase/functions/branch-partner-gateway/index.ts';
const edge=read(edgePath);
all(edge,['branch_partner_network_minute','branch_partner_network_hour','branch_partner_contact_day','provision_branch_partner_request'],'branch partner Edge protections');
if(edgePath.includes('v164')){
  all(edge,['requireAdmin','link_branch_owner_by_email','BRANCH_OWNER','provinceCode','districtCode'],'V164 branch owner and geography protections');
}else{
  assert(edge.includes('requireAdmin(request, true)'),'legacy branch partner Edge must still require admin for privileged actions');
}

const requestBoundary=read('api/_lib/request-security.ts');
all(requestBoundary,['guardOrigin','originDecision','configuredOrigins','requestId'],'shared request boundary');

console.log('Branch partner same-origin, service-role, privacy, UUID ownership and geography invariants are satisfied.');
