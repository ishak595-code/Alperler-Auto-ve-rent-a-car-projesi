#!/usr/bin/env node
/**
 * V249 → V252: kept for muscle memory. The one-time migration is now provider-agnostic
 * (scripts/migrate-media.mjs: R2 preferred, Cloudinary otherwise, all tables/columns incl.
 * site_config). This wrapper pins the Cloudinary target and forwards every flag.
 *
 *   node scripts/migrate-media-to-cloudinary.mjs            # dry-run (default)
 *   node scripts/migrate-media-to-cloudinary.mjs --apply    # write
 *   node scripts/migrate-media-to-cloudinary.mjs --apply --delete-source
 *
 * Flags are parsed by migrate-media.mjs: const APPLY = hasFlag("apply"); hasFlag("delete-source").
 */
if (!process.argv.some((arg) => arg.startsWith("--provider="))) process.argv.push("--provider=cloudinary");
await import("./migrate-media.mjs");
