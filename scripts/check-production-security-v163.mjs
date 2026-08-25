import fs from 'node:fs';
import path from 'node:path';

const read=(file)=>fs.readFileSync(file,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(`V163 invariant failed: ${message}`);};
const all=(content,needles,label)=>{for(const needle of needles)assert(content.includes(needle),`${label} missing ${needle}`);};

const base=read('supabase/migrations/20260825054500_v163_production_security_data_integrity.sql');
all(base,['add column if not exists timezone text','private.is_valid_timezone','admin_users_sync_auth_identity','customer_documents_mime_type_v163_chk','add column if not exists request_id text'],'base migration');

const approval=read('supabase/migrations/20260825071000_v163_pending_approval_and_alternatives.sql');
all(approval,[
  'drop table if exists public.booking_holds',
  'create table if not exists public.booking_alternative_offers',
  'public.evaluate_rental_request',
  'public.admin_approve_booking',
  'pg_advisory_xact_lock',
  'booking_generate_alternatives_after_approval',
  'booking_seed_alternatives_after_pending_insert',
  "new.status = 'PENDING'",
  "status = 'APPROVED'",
  'rental_alternative_candidates',
],'manual approval migration');
const seedStart=approval.indexOf('create or replace function private.seed_pending_booking_alternatives()');
const seedEnd=approval.indexOf('revoke all on function private.seed_pending_booking_alternatives()',seedStart);
const seed=approval.slice(seedStart,seedEnd);
assert(seed.includes('as $$')&&seed.includes('end;\n$$;'),'pending-alternative seed SQL must compile');

const booking=read('src/services/booking.service.ts');
all(booking,['status==="APPROVED"','action:"approve"','offerAlternative','/api/admin-booking-actions','/api/bookings','wallClockValue'],'booking client');
assert(!booking.includes('reserveRentalHold'),'customer submit must never reserve inventory');
assert(!booking.includes('evaluateRentalAvailability'),'customer submit must never be rejected by advisory availability');
assert(!booking.includes('/functions/v1/booking-gateway'),'browser booking mutation must stay behind BFF');
assert(!booking.includes('/functions/v1/booking-admin-actions'),'browser admin mutation must stay behind BFF');

const gateway=read('supabase/functions/booking-gateway/index.ts');
all(gateway,['DIRECT_BROWSER_ACCESS_DENIED','evaluateRentalRequest','CONFLICT_AT_REQUEST','APPROVAL_ACTION_REQUIRED','Customer submissions are requests, not inventory reservations'],'booking gateway');
assert(!gateway.includes('if (await hasApprovedOverlap(vehicle.id, start, end)) throw new Error("VEHICLE_UNAVAILABLE")'),'PENDING create must accept approved overlap');

const availability=read('supabase/functions/rental-availability/index.ts');
all(availability,['DIRECT_BROWSER_ACCESS_DENIED','rpc/evaluate_rental_request','advisoryOnly: true','rental_availability_minute'],'read-only availability edge');
assert(!availability.includes('reserve_rental_hold'),'availability service must be read-only');
assert(!availability.includes('access-control-allow-origin'),'availability edge must not expose direct browser CORS');

const adminEdge=read('supabase/functions/booking-admin-actions/index.ts');
all(adminEdge,['admin_approve_booking','listOffers','offer_alternative','BOOKING_ALTERNATIVE_OFFERED','user_id=eq.'],'admin booking edge');
assert(!adminEdge.includes('admin_users?email=eq.'),'admin booking Edge must bind admin authorization to immutable user UUID');
const bookingApi=read('api/bookings.ts');
all(bookingApi,['guardOrigin','x-request-id','x-upstream-request-id','rentalAvailability','adminBookingActions','booking-admin-actions'],'consolidated booking BFF');
const vercelText=read('vercel.json');
assert(vercelText.includes('"/api/admin-booking-actions", "destination": "/api/bookings?mode=admin-booking-actions"'),'admin booking route must reuse booking BFF');
assert(!fs.existsSync('api/admin-booking-actions.ts'),'separate admin booking Vercel function must stay removed');
assert(!fs.existsSync('supabase/functions/booking-browser-gateway/index.ts'),'unused direct browser booking Edge must stay removed');
const adminUi=read('src/pages/admin/admin-reservations.component.ts');
all(adminUi,['Onay bekleyen talepler aracı kilitlemez','Alternatif bul','Müşteriye Öner','WhatsApp','bookingService.offerAlternative'],'admin satisfaction workflow');

const branchModel=read('src/models/branch.model.ts');
const branchService=read('src/services/branch.service.ts');
const branchApi=read('api/branches.ts');
const branchAdmin=read('src/pages/admin/admin-branches.component.ts');
assert(branchModel.includes('timezone?: string'),'branch model must expose timezone');
assert(branchService.includes('Europe/Istanbul'),'branch service must default timezone safely');
assert(branchApi.includes('timezone:'),'branch API must persist timezone');
all(branchAdmin,['Saat Dilimi','draft.timezone','Europe/Istanbul'],'admin timezone editor');

const adminAccess=read('src/services/admin-access.service.ts');
assert(adminAccess.includes('admin_users?user_id=eq.'),'admin auth must bind immutable UUID');
assert(!adminAccess.includes('admin_users?email=eq.'),'admin auth must not depend on mutable email');

const documentEdge=read('supabase/functions/customer-document-upload/index.ts');
all(documentEdge,['const BUCKET = "customer-documents"','verifySignature','DOCUMENT_SIGNATURE_INVALID','authorization: userAuthorization','VAULT_CONSENT_REQUIRED'],'private document edge');
const customerWallet=read('src/services/customer-wallet.service.ts');
all(customerWallet,["documentBucket='customer-documents'",'detectFileSignature','customer-document-upload'],'customer document client');
assert(!customerWallet.includes("documentBucket='customer-private'"),'customer document client must use canonical private bucket');
const storageBinding=read('supabase/migrations/20260825061000_v163_document_storage_binding.sql');
all(storageBinding,['validate_customer_document_storage_binding',"bucket_id = 'customer-documents'",'CUSTOMER_DOCUMENT_STORAGE_OWNER_MISMATCH','CUSTOMER_DOCUMENT_STORAGE_MIME_MISMATCH'],'document storage binding');

const security=read('api/_lib/request-security.ts');
all(security,['originDecision','requestId','guardOrigin','access-control-allow-origin','vary'],'request boundary');
all(bookingApi,['guardOrigin','x-request-id','x-upstream-request-id','rentalAvailability'],'booking BFF');

const vercel=JSON.parse(vercelText);
const headers=vercel.headers?.find((r)=>r.source==='/(.*)')?.headers||[];
const csp=headers.find((h)=>h.key==='Content-Security-Policy')?.value||'';
all(csp,["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self'",'upgrade-insecure-requests'],'CSP');

const carDetail=read('src/pages/car-detail.component.ts');
assert(!carDetail.includes('getTechnicalSpecs'),'public vehicle detail must not depend on compiled make/model lookup');
all(carDetail,['car.technicalSpecs','car.enginePower','car.fuelConsumption','car.fuelTankCapacity'],'dynamic technical data');
const legacySpecs=read('src/data/technical-specs.data.ts');
assert(!legacySpecs.includes('CAR_SPECS_DB'),'static technical-spec database must stay removed');
all(legacySpecs,["fetch('/api/catalog?resource=vehicles'",'technicalSpecs'],'technical-spec live compatibility adapter');

const pkg=JSON.parse(read('package.json'));
assert(pkg.devDependencies?.tailwindcss==='4.2.1','Tailwind must be pinned as a build-only dependency');
for(const name of ['@angular/common','@angular/compiler','@angular/core','@angular/forms','@angular/platform-browser','@angular/router']){
  assert(/^21\.2\.(?:2[0-9]|[3-9][0-9])$/.test(String(pkg.dependencies?.[name]||'')),`${name} must stay on patched Angular 21.2.20+`);
}
assert(/^9\./.test(String(pkg.dependencies?.nodemailer||'')),'Nodemailer must stay on the hardened v9 line');
for(const name of ['@angular/build','@angular/cli','@angular/compiler-cli']) assert(pkg.devDependencies?.[name],`${name} must remain build-only`);

function scan(root,needle,out=[]){if(!fs.existsSync(root))return out;const stat=fs.statSync(root);if(stat.isFile()){if(read(root).includes(needle))out.push(root);return out;}for(const name of fs.readdirSync(root)){const target=path.join(root,name);const s=fs.statSync(target);if(s.isDirectory())scan(target,needle,out);else if(/\.(ts|js|mjs|cjs|json|html|css|sql|md|yml|yaml)$/.test(name)&&read(target).includes(needle))out.push(target);}return out;}
const removed='alperrentacar'+'.online';
const hits=[...scan('src',removed),...scan('api',removed),...scan('supabase',removed),...scan('public',removed),...scan('vercel.json',removed)];
assert(hits.length===0,`removed domain returned in ${hits.join(', ')}`);

console.log('V163 final manual-approval, customer-satisfaction, security and data-integrity invariants are satisfied.');
