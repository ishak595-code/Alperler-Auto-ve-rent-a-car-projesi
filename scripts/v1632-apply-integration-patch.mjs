import fs from 'node:fs';

function patch(file, from, to, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(from)) throw new Error(`${file}: missing patch anchor ${label}`);
  const next = source.replace(from, to);
  if (next === source) throw new Error(`${file}: patch ${label} produced no change`);
  fs.writeFileSync(file, next);
}

// Booking model: persist both pickup and return branch identities behind the
// existing human-readable location labels.
patch(
  'src/models/booking.model.ts',
  '  pickupBranchId?: string;\n  pickupLocation?: string;\n  dropoffLocation?: string;',
  '  pickupBranchId?: string;\n  dropoffBranchId?: string;\n  pickupLocation?: string;\n  dropoffLocation?: string;',
  'dropoff branch identity',
);

// Checkout: preserve labels visually, but keep the immutable DB branch UUID in
// the choice object so timezone and fulfillment can be resolved server-side.
patch(
  'src/pages/booking-checkout.component.ts',
  'interface LocationChoice { key: string; label: string; }',
  'interface LocationChoice { key: string; label: string; branchId?: string; }',
  'location choice branch id',
);

patch(
  'src/pages/booking-checkout.component.ts',
  '<div class="location-grid"><label class="field"><span>Nereden alınacak?</span><select [ngModel]="pickupLocation()" (ngModelChange)="setPickupLocation($event)" aria-label="Teslim alma noktası"><option value="">Teslim alma noktası seçin</option>@for (choice of pickupChoices(); track choice.key) {<option [value]="choice.label">{{ choice.label }}</option>}</select></label><label class="field"><span>Nereye iade edilecek?</span><select [ngModel]="dropoffLocation()" (ngModelChange)="setDropoffLocation($event)" aria-label="İade noktası"><option value="">İade noktası seçin</option>@for (choice of returnChoices(); track choice.key) {<option [value]="choice.label">{{ choice.label }}</option>}</select></label></div>\n                @if (additionalExtras().length)',
  '<div class="location-grid"><label class="field"><span>Nereden alınacak?</span><select [ngModel]="pickupLocation()" (ngModelChange)="setPickupLocation($event)" aria-label="Teslim alma noktası"><option value="">Teslim alma noktası seçin</option>@for (choice of pickupChoices(); track choice.key) {<option [value]="choice.label">{{ choice.label }}</option>}</select></label><label class="field"><span>Nereye iade edilecek?</span><select [ngModel]="dropoffLocation()" (ngModelChange)="setDropoffLocation($event)" aria-label="İade noktası"><option value="">İade noktası seçin</option>@for (choice of returnChoices(); track choice.key) {<option [value]="choice.label">{{ choice.label }}</option>}</select></label></div>\n                @if (!selectedPeriodAvailable()) {<div class="hourly-note" role="note"><mat-icon aria-hidden="true">info</mat-icon><span>Bu zaman aralığı mevcut onaylı kayıtlara göre dolu görünüyor. Talebinizi yine de gönderebilirsiniz; ekip uygun alternatif araçları değerlendirecek.</span></div>}\n                @if (additionalExtras().length)',
  'non-blocking availability advisory',
);

patch(
  'src/pages/booking-checkout.component.ts',
  'continueFromPlan():void{const periodError=this.rentalPeriodError();if(periodError){this.errorMessage.set(periodError);return;}if(!this.pickupLocation()){this.errorMessage.set("Teslim alma noktasını seçin.");return;}if(!this.driverAllowed(this.withDriver())){this.errorMessage.set("Bu araç için geçerli sürücü tercihini seçin.");return;}if(!this.selectedPeriodAvailable()){this.errorMessage.set("Bu araç seçtiğiniz zaman aralığında artık müsait değil. Lütfen farklı tarih, saat veya araç seçin.");return;}if(!this.dropoffLocation())this.dropoffLocation.set(this.pickupLocation());this.errorMessage.set("");this.checkoutStep.set(2);window.scrollTo({top:0,behavior:"smooth"});}',
  'continueFromPlan():void{const periodError=this.rentalPeriodError();if(periodError){this.errorMessage.set(periodError);return;}if(!this.pickupLocation()){this.errorMessage.set("Teslim alma noktasını seçin.");return;}if(!this.driverAllowed(this.withDriver())){this.errorMessage.set("Bu araç için geçerli sürücü tercihini seçin.");return;}if(!this.dropoffLocation())this.dropoffLocation.set(this.pickupLocation());this.errorMessage.set("");this.checkoutStep.set(2);window.scrollTo({top:0,behavior:"smooth"});}',
  'do not block pending request in planning',
);

patch(
  'src/pages/booking-checkout.component.ts',
  'if(!this.driverAllowed(this.withDriver())){this.errorMessage.set("Araç için geçerli sürücü tercihini seçin.");this.checkoutStep.set(1);return;}if(!this.selectedPeriodAvailable()){this.errorMessage.set("Bu araç seçtiğiniz zaman aralığında artık müsait değil. Lütfen başka zaman veya araç seçin.");this.checkoutStep.set(1);return;}if(this.paymentMethod()==="CARD"&&!this.paymentService.cardReady())',
  'if(!this.driverAllowed(this.withDriver())){this.errorMessage.set("Araç için geçerli sürücü tercihini seçin.");this.checkoutStep.set(1);return;}if(this.paymentMethod()==="CARD"&&!this.paymentService.cardReady())',
  'do not block pending request on submit',
);

patch(
  'src/pages/booking-checkout.component.ts',
  'withDriver:this.isRental()?this.withDriver():undefined,pickupLocation:this.isRental()?this.pickupLocation():booking.pickupLocation,dropoffLocation:this.isRental()?(this.dropoffLocation()||this.pickupLocation()):undefined,rentalDuration:',
  'withDriver:this.isRental()?this.withDriver():undefined,pickupBranchId:this.isRental()?this.selectedPickupBranchId():undefined,dropoffBranchId:this.isRental()?this.selectedDropoffBranchId():undefined,pickupLocation:this.isRental()?this.pickupLocation():booking.pickupLocation,dropoffLocation:this.isRental()?(this.dropoffLocation()||this.pickupLocation()):undefined,rentalDuration:',
  'send branch ids with booking',
);

patch(
  'src/pages/booking-checkout.component.ts',
  'private buildLocationChoices(branches:Branch[],serviceRuleKey:string):LocationChoice[]{const values:LocationChoice[]=[];for(const branch of branches){const raw=branch.serviceRules?.[serviceRuleKey];const locations=Array.isArray(raw)?raw.map((value)=>String(value||"").trim()).filter(Boolean).slice(0,16):[];if(locations.length)locations.forEach((label,index)=>values.push({key:`${branch.id}:${serviceRuleKey}:${index}`,label}));else values.push({key:`${branch.id}:${serviceRuleKey}:main`,label:`${branch.name} · ${branch.district||branch.city}`});}return values.filter((item,index,list)=>list.findIndex((other)=>other.label===item.label)===index);}',
  'private selectedPickupBranchId():string|undefined{return this.pickupChoices().find((choice)=>choice.label===this.pickupLocation())?.branchId;}\n  private selectedDropoffBranchId():string|undefined{return this.returnChoices().find((choice)=>choice.label===this.dropoffLocation())?.branchId||this.selectedPickupBranchId();}\n  private buildLocationChoices(branches:Branch[],serviceRuleKey:string):LocationChoice[]{const values:LocationChoice[]=[];for(const branch of branches){const raw=branch.serviceRules?.[serviceRuleKey];const locations=Array.isArray(raw)?raw.map((value)=>String(value||"").trim()).filter(Boolean).slice(0,16):[];const branchId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(branch.cloudId||""))?String(branch.cloudId):undefined;if(locations.length)locations.forEach((label,index)=>values.push({key:`${branch.id}:${serviceRuleKey}:${index}`,label,branchId}));else values.push({key:`${branch.id}:${serviceRuleKey}:main`,label:`${branch.name} · ${branch.district||branch.city}`,branchId});}return values.filter((item,index,list)=>list.findIndex((other)=>other.label===item.label)===index);}',
  'resolve selected branch ids',
);

// The payment selector is a real radiogroup; expose radio semantics without
// changing the existing visual buttons.
for (const method of ['OFFICE','EFT','CARD']) {
  patch(
    'src/pages/booking-checkout.component.ts',
    `(click)="selectPayment('${method}')" [class.active]="paymentMethod() === '${method}'"`,
    `(click)="selectPayment('${method}')" role="radio" [attr.aria-checked]="paymentMethod() === '${method}'" [class.active]="paymentMethod() === '${method}'"`,
    `payment ${method} radio semantics`,
  );
}

// Booking API model normalization keeps both branch UUIDs.
patch(
  'src/services/booking.service.ts',
  'pickupBranchId:this.optionalUuid(input.pickupBranchId),pickupLocation:',
  'pickupBranchId:this.optionalUuid(input.pickupBranchId),dropoffBranchId:this.optionalUuid(input.dropoffBranchId),pickupLocation:',
  'normalize both branch ids',
);

// Gateway response maps both UUIDs back to the admin/customer application.
patch(
  'supabase/functions/booking-gateway/index.ts',
  '    pickupBranchId: row.pickup_branch_id || undefined,\n    pickupLocation: row.pickup_location || undefined,',
  '    pickupBranchId: row.pickup_branch_id || undefined,\n    dropoffBranchId: row.dropoff_branch_id || undefined,\n    pickupLocation: row.pickup_location || undefined,',
  'gateway response branch ids',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  'async function evaluateRentalRequest(identifier: string, startValue: unknown, endValue: unknown): Promise<any> {\n  const response = await db("rpc/evaluate_rental_request", {\n    method: "POST",\n    body: JSON.stringify({\n      p_vehicle_identifier: identifier,\n      p_start_local: rentalWallClock(startValue),\n      p_end_local: rentalWallClock(endValue),\n    }),\n  });',
  'async function evaluateRentalRequest(identifier: string, startValue: unknown, endValue: unknown, pickupBranchId?: string | null): Promise<any> {\n  const response = await db("rpc/evaluate_rental_request_v2", {\n    method: "POST",\n    body: JSON.stringify({\n      p_vehicle_identifier: identifier,\n      p_start_local: rentalWallClock(startValue),\n      p_end_local: rentalWallClock(endValue),\n      p_pickup_branch_id: pickupBranchId || null,\n    }),\n  });',
  'gateway selected pickup timezone rpc',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '    if (raw.includes("INVALID_BRANCH_TIMEZONE")) throw new Error("INVALID_BRANCH_TIMEZONE");\n    if (raw.includes("INVALID_RENTAL_VEHICLE")) throw new Error("INVALID_RENTAL_VEHICLE");',
  '    if (raw.includes("INVALID_BRANCH_TIMEZONE")) throw new Error("INVALID_BRANCH_TIMEZONE");\n    if (raw.includes("INVALID_PICKUP_BRANCH")) throw new Error("INVALID_PICKUP_BRANCH");\n    if (raw.includes("INVALID_RENTAL_VEHICLE")) throw new Error("INVALID_RENTAL_VEHICLE");',
  'gateway pickup branch error mapping',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '  withDriver: boolean,\n) {',
  '  withDriver: boolean,\n  timezone: string,\n) {',
  'authoritative rental timezone argument',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '  const timezone = await branchTimezone(vehicle.branch_id);\n  const days = rentalDays(start, end, timezone);',
  '  const days = rentalDays(start, end, timezone);',
  'daily pricing uses evaluated branch timezone',
);

// Validate customer-supplied branch UUIDs against live branch state. Service
// role does the read; public clients cannot forge an inactive pickup/return point.
patch(
  'supabase/functions/booking-gateway/index.ts',
  'async function evaluateRentalRequest(identifier: string, startValue: unknown, endValue: unknown, pickupBranchId?: string | null): Promise<any> {',
  'async function operationalBranch(branchId: string, kind: "pickup" | "dropoff"): Promise<any> {\n  if (!uuid(branchId)) throw new Error(kind === "pickup" ? "INVALID_PICKUP_BRANCH" : "INVALID_DROPOFF_BRANCH");\n  const flag = kind === "pickup" ? "is_pickup_point" : "is_return_point";\n  const row = await firstRow(`branches?id=eq.${encodeURIComponent(branchId)}&is_active=eq.true&public_status=eq.ACTIVE&${flag}=eq.true&select=id,timezone&limit=1`);\n  if (!row?.id) throw new Error(kind === "pickup" ? "INVALID_PICKUP_BRANCH" : "INVALID_DROPOFF_BRANCH");\n  return row;\n}\n\nasync function evaluateRentalRequest(identifier: string, startValue: unknown, endValue: unknown, pickupBranchId?: string | null): Promise<any> {',
  'operational branch validation',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '    let pickupBranchId = uuid(clean(body?.pickupBranchId, 80))\n      ? clean(body?.pickupBranchId, 80)\n      : null;\n\n    if (type === "RENTAL") {',
  '    const pickupBranchInput = clean(body?.pickupBranchId, 80);\n    const dropoffBranchInput = clean(body?.dropoffBranchId, 80);\n    let pickupBranchId: string | null = null;\n    let dropoffBranchId: string | null = null;\n\n    if (type === "RENTAL") {',
  'parse branch identities explicitly',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '      const vehicle = await getRentalVehicle(itemId);\n      vehicleId = String(vehicle.id);\n      const evaluation = await evaluateRentalRequest(itemId, body?.startDate, body?.endDate);\n      startAt = String(evaluation.startAt);\n      endAt = String(evaluation.endAt);\n\n      const withDriver = Boolean(body?.withDriver);\n      const calculation = await authoritativeRental(body, vehicle, startAt, endAt, withDriver);',
  '      const vehicle = await getRentalVehicle(itemId);\n      vehicleId = String(vehicle.id);\n      if (pickupBranchInput) await operationalBranch(pickupBranchInput, "pickup");\n      if (dropoffBranchInput) await operationalBranch(dropoffBranchInput, "dropoff");\n      const evaluation = await evaluateRentalRequest(itemId, body?.startDate, body?.endDate, pickupBranchInput || null);\n      startAt = String(evaluation.startAt);\n      endAt = String(evaluation.endAt);\n      pickupBranchId = uuid(String(evaluation.pickupBranchId || "")) ? String(evaluation.pickupBranchId) : null;\n      dropoffBranchId = dropoffBranchInput || pickupBranchId;\n\n      const withDriver = Boolean(body?.withDriver);\n      const calculation = await authoritativeRental(body, vehicle, startAt, endAt, withDriver, String(evaluation.branchTimezone || "Europe/Istanbul"));',
  'evaluate using selected branch',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '      pickupBranchId = pickupBranchId ||\n        (uuid(String(vehicle.branch_id || "")) ? String(vehicle.branch_id) : null);\n      metadata = {',
  '      metadata = {\n        pickup_branch_id: pickupBranchId,\n        dropoff_branch_id: dropoffBranchId,\n        branch_timezone: String(evaluation.branchTimezone || "Europe/Istanbul"),',
  'persist resolved branch metadata',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '      pickup_branch_id: pickupBranchId,\n      pickup_location:',
  '      pickup_branch_id: pickupBranchId,\n      dropoff_branch_id: dropoffBranchId,\n      pickup_location:',
  'persist dropoff branch column',
);

patch(
  'supabase/functions/booking-gateway/index.ts',
  '      : code === "INVALID_RENTAL_DATES"\n      ? "Teslim alma ve iade tarihlerini kontrol edin."',
  '      : code === "INVALID_PICKUP_BRANCH"\n      ? "Seçtiğiniz teslim alma şubesi şu anda kiralama teslimine açık değil."\n      : code === "INVALID_DROPOFF_BRANCH"\n      ? "Seçtiğiniz iade şubesi şu anda araç iadesine açık değil."\n      : code === "INVALID_RENTAL_DATES"\n      ? "Teslim alma ve iade tarihlerini kontrol edin."',
  'branch error messages',
);

// Advisory Edge reads the same v2 DB contract. It remains read-only and BFF-only.
patch(
  'supabase/functions/rental-availability/index.ts',
  '    const response = await rest("rpc/evaluate_rental_request", {\n      method: "POST",\n      headers: { "x-request-id": id },\n      body: JSON.stringify({ p_vehicle_identifier: vehicleIdentifier, p_start_local: startLocal, p_end_local: endLocal }),\n    });',
  '    const pickupBranchId = clean(input["pickupBranchId"], 80);\n    const response = await rest("rpc/evaluate_rental_request_v2", {\n      method: "POST",\n      headers: { "x-request-id": id },\n      body: JSON.stringify({ p_vehicle_identifier: vehicleIdentifier, p_start_local: startLocal, p_end_local: endLocal, p_pickup_branch_id: pickupBranchId || null }),\n    });',
  'availability selected pickup branch',
);

patch(
  'supabase/functions/rental-availability/index.ts',
  '      const code = raw.includes("INVALID_RENTAL_VEHICLE") ? "INVALID_RENTAL_VEHICLE" : raw.includes("INVALID_BRANCH_TIMEZONE") ? "INVALID_BRANCH_TIMEZONE" : raw.includes("INVALID_RENTAL_DATES") ? "INVALID_RENTAL_DATES" : "AVAILABILITY_CHECK_FAILED";',
  '      const code = raw.includes("INVALID_RENTAL_VEHICLE") ? "INVALID_RENTAL_VEHICLE" : raw.includes("INVALID_PICKUP_BRANCH") ? "INVALID_PICKUP_BRANCH" : raw.includes("INVALID_BRANCH_TIMEZONE") ? "INVALID_BRANCH_TIMEZONE" : raw.includes("INVALID_RENTAL_DATES") ? "INVALID_RENTAL_DATES" : "AVAILABILITY_CHECK_FAILED";',
  'availability pickup branch error',
);

console.log('V163.2 integration patch applied successfully.');
