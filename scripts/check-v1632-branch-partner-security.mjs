import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(`V163.2 invariant failed: ${message}`);};
const all=(content,needles,label)=>{for(const needle of needles)assert(content.includes(needle),`${label} missing ${needle}`);};

const client=read('src/services/branch-partner.service.ts');
all(client,['private readonly endpoint = "/api/branch-partner"','x-request-id','authorization: `Bearer ${token}`'],'branch partner client');
assert(!client.includes('/functions/v1/branch-partner-gateway'),'browser must not call branch partner Edge directly');
assert(!client.includes('SUPABASE_PUBLISHABLE_KEY'),'same-origin BFF must own the Supabase boundary');

const api=read('api/branch-partner.ts');
all(api,['guardOrigin','originDecision','clientIp','x-request-id','x-upstream-request-id','/functions/v1/branch-partner-gateway','PAYLOAD_TOO_LARGE'],'branch partner BFF');
assert(!api.includes('access-control-allow-origin: *'),'BFF must never expose wildcard CORS');

const boundary=read('supabase/migrations/20260825102000_v1632_branch_partner_boundary.sql');
all(boundary,['revoke all on table public.branch_partner_requests from anon, authenticated','grant all on table public.branch_partner_requests to service_role','enable row level security'],'branch partner database boundary');
const deny=read('supabase/migrations/20260825103000_v1632_branch_partner_explicit_deny.sql');
all(deny,['branch_partner_requests_anon_deny','branch_partner_requests_authenticated_deny','as restrictive','using (false)','with check (false)'],'branch partner explicit deny policy');

const edge=read('supabase/functions/branch-partner-gateway/index.ts');
all(edge,['branch_partner_network_minute','branch_partner_network_hour','branch_partner_contact_day','requireAdmin(request, true)','provision_branch_partner_request'],'branch partner Edge protections');

const requestBoundary=read('api/_lib/request-security.ts');
all(requestBoundary,['guardOrigin','originDecision','configuredOrigins','requestId'],'shared request boundary');

console.log('V163.2 branch-partner same-origin, service-role and explicit-deny privacy invariants are satisfied.');
