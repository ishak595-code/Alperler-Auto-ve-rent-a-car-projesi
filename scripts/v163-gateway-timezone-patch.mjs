import fs from 'node:fs';
const path='supabase/functions/booking-gateway/index.ts';
let s=fs.readFileSync(path,'utf8');
const oldDays=`function rentalDays(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error("INVALID_RENTAL_DATES");
  }
  const days = Math.ceil((endMs - startMs) / 86_400_000);
  if (days < 1 || days > 3650) throw new Error("INVALID_RENTAL_DATES");
  return days;
}`;
const newDays=`async function branchTimezone(branchId: string | null | undefined): Promise<string> {
  if (!branchId || !uuid(String(branchId))) return "Europe/Istanbul";
  const branch = await firstRow(
    \`branches?id=eq.\${encodeURIComponent(String(branchId))}&select=timezone&limit=1\`,
  );
  const timezone = clean(branch?.timezone, 80) || "Europe/Istanbul";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    throw new Error("INVALID_BRANCH_TIMEZONE");
  }
}

function localCalendarDayNumber(value: string, timezone: string): number {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) throw new Error("INVALID_RENTAL_DATES");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (!year || !month || !day) throw new Error("INVALID_RENTAL_DATES");
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function rentalDays(start: string, end: string, timezone: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error("INVALID_RENTAL_DATES");
  }
  const days = localCalendarDayNumber(end, timezone) - localCalendarDayNumber(start, timezone);
  if (days < 1 || days > 3650) throw new Error("INVALID_RENTAL_DATES");
  return days;
}`;
if(!s.includes(oldDays)) throw new Error('rentalDays target missing');
s=s.replace(oldDays,newDays);
const oldCall='  const days = rentalDays(start, end);';
const newCall='  const timezone = await branchTimezone(vehicle.branch_id);\n  const days = rentalDays(start, end, timezone);';
if(!s.includes(oldCall)) throw new Error('rentalDays call target missing');
s=s.replace(oldCall,newCall);

// Protected admin methods fail closed on unknown roles instead of silently
// mapping unexpected database values to support.
const oldAdmin='  return { id: userId, email, role: String(rows[0].role || "support") };';
const newAdmin='  const role = String(rows[0].role || "");\n  if (!["owner", "admin", "editor", "support"].includes(role)) throw new Error("FORBIDDEN");\n  return { id: userId, email, role };';
if(!s.includes(oldAdmin)) throw new Error('admin role target missing');
s=s.replace(oldAdmin,newAdmin);
fs.writeFileSync(path,s);
console.log('V163 booking gateway DST-safe patch applied');
