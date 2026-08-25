const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);

// Browser stays on the same-origin BFF. No direct Supabase business mutation fallback.
{
 const p='src/services/booking.service.ts';let s=read(p);
 s=s.replace('import { SUPABASE_PROJECT_URL } from "../supabase.config";\n','');
 s=s.replace(/private async adminAction\(method:"GET"\|"POST",body\?:unknown\):Promise<AdminActionResponse>\{[\s\S]*?\n\n  private async request/,`private async adminAction(method:"GET"|"POST",body?:unknown):Promise<AdminActionResponse>{const token=await this.authService.getAccessToken();if(!token)throw new Error("ADMIN_SESSION_REQUIRED");const headers={Authorization:\`Bearer \${token}\`,"content-type":"application/json","x-request-id":crypto.randomUUID()};try{return method==="GET"?await firstValueFrom(this.http.get<AdminActionResponse>("/api/admin-booking-actions",{headers})):await firstValueFrom(this.http.post<AdminActionResponse>("/api/admin-booking-actions",body,{headers}));}catch(error){throw this.normalizeRequestError(error);}}

  private async request`);
 s=s.replace(/private async request<T>\(method:"GET"\|"POST"\|"PATCH"\|"DELETE",body\?:unknown\):Promise<T>\{[\s\S]*?\n  private normalizeRequestError/,`private async request<T>(method:"GET"|"POST"|"PATCH"|"DELETE",body?:unknown):Promise<T>{const token=method==="POST"?await this.customerAuth.getAccessToken().catch(()=>null):await this.authService.getAccessToken();if(method!=="POST"&&!token)throw new Error("ADMIN_SESSION_REQUIRED");const headers=token?{Authorization:\`Bearer \${token}\`}:undefined;try{if(method==="POST")return await firstValueFrom(this.http.post<T>("/api/bookings",body,headers?{headers}:{}));if(method==="GET")return await firstValueFrom(this.http.get<T>("/api/bookings",{headers:headers!}));return await firstValueFrom(this.http.request<T>(method,"/api/bookings",{body,headers:headers!}));}catch(error){throw this.normalizeRequestError(error);}}
  private normalizeRequestError`);
 if(s.includes('/functions/v1/booking-gateway')||s.includes('/functions/v1/booking-admin-actions'))throw new Error('DIRECT_BROWSER_FALLBACK_REMAINED');write(p,s);
}

// APPROVED is capacity allocation and therefore only the atomic admin RPC may perform it.
{
 const p='supabase/functions/booking-gateway/index.ts';let s=read(p);
 if(!s.includes('APPROVAL_ACTION_REQUIRED')){
  const n='      if (!["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {\n        throw new Error("INVALID_STATUS");\n      }\n\n      if (\n        status === "APPROVED" &&';
  const r='      if (!["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {\n        throw new Error("INVALID_STATUS");\n      }\n      if (status === "APPROVED") {\n        return json({ ok:false, code:"APPROVAL_ACTION_REQUIRED", message:"Rezervasyon onayı atomik yönetim onay servisi üzerinden yapılmalıdır." },409);\n      }\n\n      if (\n        false &&';
  if(!s.includes(n))throw new Error('APPROVAL_GUARD_ANCHOR_MISSING');s=s.replace(n,r);
 }
 write(p,s);
}

// Fix the pending-alternative seed function delimiters by replacing only the isolated block.
{
 const p='supabase/migrations/20260825071000_v163_pending_approval_and_alternatives.sql';let s=read(p);
 const start=s.indexOf('create or replace function private.seed_pending_booking_alternatives()');
 const revoke=s.indexOf('revoke all on function private.seed_pending_booking_alternatives()',start);
 if(start<0||revoke<0)throw new Error('SEED_BLOCK_MISSING');
 let b=s.slice(start,revoke);const open=b.indexOf('as $');if(open<0)throw new Error('SEED_OPEN_MISSING');
 const declare=b.indexOf('declare',open);if(declare<0)throw new Error('SEED_DECLARE_MISSING');
 b=b.slice(0,open)+'as $$\n'+b.slice(declare);
 const close=b.lastIndexOf('$;');if(close<0)throw new Error('SEED_CLOSE_MISSING');
 b=b.slice(0,close)+'$$;\n\n';
 s=s.slice(0,start)+b+s.slice(revoke);
 const check=s.slice(start,s.indexOf('revoke all on function private.seed_pending_booking_alternatives()',start));
 if(!check.includes('as $$\n')||!check.includes('end;\n$$;'))throw new Error('SEED_REPAIR_FAILED');write(p,s);
}

// Real private bucket + end-user JWT means storage.objects.owner is the customer UUID.
{
 const p='supabase/functions/customer-document-upload/index.ts';let s=read(p);
 s=s.replace('const BUCKET = "customer-private";','const BUCKET = "customer-documents";');
 const a='    const user = await authenticatedUser(request);';if(!s.includes('const userAuthorization = request.headers.get("authorization") || "";')){if(!s.includes(a))throw new Error('DOC_AUTH_ANCHOR_MISSING');s=s.replace(a,a+'\n    const userAuthorization = request.headers.get("authorization") || "";');}
 s=s.replace('        authorization: `Bearer ${SERVICE_KEY}`,\n        "content-type": verified.mime,','        authorization: userAuthorization,\n        "content-type": verified.mime,');
 if(!s.includes('const BUCKET = "customer-documents";')||!s.includes('authorization: userAuthorization'))throw new Error('DOC_UPLOAD_HARDENING_FAILED');write(p,s);
}
console.log('V163 final architecture patch ready.');
