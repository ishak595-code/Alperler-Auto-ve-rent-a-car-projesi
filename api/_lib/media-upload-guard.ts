/**
 * V253 media upload abuse guard.
 *
 * Every SIGN_UPLOAD reserves its bytes through the service-role RPC `media_upload_reserve_v253`
 * before any upload URL/signature leaves the server:
 *   - max signings per user per hour (default 60) and bytes per user per day (default 3 GB);
 *   - R2 bucket growth guard (default 9 GB of the 10 GB free tier): the bucket is re-measured at
 *     most hourly with ListObjectsV2, and bytes signed since then count as stored (pessimistic);
 *   - Cloudinary fallback monthly signing cap (default 5 GB).
 * If the guard cannot be reached the request fails closed (503) so a DB outage never opens uploads.
 */
export type GuardProvider = "r2" | "cloudinary";
type Json = Record<string, unknown>;

export interface GuardLimits { hourly: number; dailyBytes: number; storageBytes: number; cloudinaryMonthlyBytes: number }

export const DEFAULT_GUARD_LIMITS: GuardLimits = {
  hourly: 60,
  dailyBytes: 3_000_000_000,
  storageBytes: 9_000_000_000,
  cloudinaryMonthlyBytes: 5_000_000_000,
};

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function guardLimits(env: Record<string, string | undefined> = process.env): GuardLimits {
  return {
    hourly: positiveInt(env.MEDIA_UPLOAD_HOURLY_LIMIT, DEFAULT_GUARD_LIMITS.hourly),
    dailyBytes: positiveInt(env.MEDIA_UPLOAD_DAILY_BYTES, DEFAULT_GUARD_LIMITS.dailyBytes),
    // Never above 10 GB (the R2 free tier) even if the env var is set higher by mistake.
    storageBytes: Math.min(positiveInt(env.R2_STORAGE_LIMIT_BYTES, DEFAULT_GUARD_LIMITS.storageBytes), 10_000_000_000),
    cloudinaryMonthlyBytes: positiveInt(env.CLOUDINARY_MONTHLY_BYTES, DEFAULT_GUARD_LIMITS.cloudinaryMonthlyBytes),
  };
}

/** Bytes a signing request may upload (R2: every presigned file; Cloudinary: declared size). */
export function reservationBytes(provider: GuardProvider, input: Json): { bytes: number; files: number } {
  if (provider === "r2") {
    const files = Array.isArray(input["files"]) ? input["files"] as Array<{ bytes?: unknown }> : [];
    return { bytes: files.reduce((sum, file) => sum + Math.max(0, Math.trunc(Number(file?.bytes) || 0)), 0), files: files.length };
  }
  return { bytes: Math.max(0, Math.trunc(Number(input["bytes"]) || 0)), files: 1 };
}

export const GUARD_STATUS: Record<string, number> = {
  MEDIA_UPLOAD_RATE_LIMITED: 429,
  MEDIA_DAILY_QUOTA: 429,
  CLOUDINARY_MONTHLY_QUOTA: 429,
  MEDIA_STORAGE_FULL: 507,
};

export interface GuardDeps {
  rpc(name: string, args: Json): Promise<unknown>;
  measureR2?(): Promise<{ ok: boolean; bytes: number; objects: number; complete: boolean }>;
}

export type GuardDecision = { ok: true } | { ok: false; code: string; status: number; retryAfterSeconds?: number };

export async function reserveUpload(
  request: { userId: string; provider: GuardProvider; bytes: number; files: number },
  deps: GuardDeps,
  limits: GuardLimits = guardLimits(),
): Promise<GuardDecision> {
  try {
    if (request.provider === "r2" && deps.measureR2) {
      const status = await deps.rpc("media_storage_status_v253", { p_provider: "r2" }) as { stale?: unknown } | null;
      if (status?.stale === true) {
        // Measurement failures are tolerated: the pessimistic counter keeps growing until the next try.
        const measured = await deps.measureR2().catch(() => null);
        if (measured?.ok) {
          await deps.rpc("media_storage_measure_v253", { p_provider: "r2", p_bytes: measured.bytes, p_objects: measured.objects, p_complete: measured.complete });
        }
      }
    }
    const result = await deps.rpc("media_upload_reserve_v253", {
      p_user: request.userId,
      p_provider: request.provider,
      p_bytes: request.bytes,
      p_files: request.files,
      p_hourly_limit: limits.hourly,
      p_daily_bytes: limits.dailyBytes,
      p_storage_limit: limits.storageBytes,
      p_monthly_bytes: limits.cloudinaryMonthlyBytes,
    }) as { ok?: unknown; code?: unknown; retryAfterSeconds?: unknown } | null;
    if (result?.ok === true) return { ok: true };
    const code = String(result?.code || "MEDIA_GUARD_UNAVAILABLE");
    const retry = Number(result?.retryAfterSeconds);
    return { ok: false, code, status: GUARD_STATUS[code] || 503, ...(Number.isFinite(retry) && retry > 0 ? { retryAfterSeconds: retry } : {}) };
  } catch {
    return { ok: false, code: "MEDIA_GUARD_UNAVAILABLE", status: 503 };
  }
}
