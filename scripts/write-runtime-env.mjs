#!/usr/bin/env node
/**
 * Post-build: inject non-secret public origin into dist/runtime-env.js so Auth
 * redirectTo never falls back to localhost on production/preview deployments.
 * Does not invent a purchased domain — uses APP_PUBLIC_ORIGIN / PUBLIC_APP_URL /
 * SITE_URL, then Vercel production/deployment host when present.
 */
import fs from 'node:fs';
import path from 'node:path';

function normalizeHttpsOrigin(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

const configured =
  normalizeHttpsOrigin(process.env.APP_PUBLIC_ORIGIN) ||
  normalizeHttpsOrigin(process.env.PUBLIC_APP_URL) ||
  normalizeHttpsOrigin(process.env.SITE_URL) ||
  normalizeHttpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizeHttpsOrigin(process.env.VERCEL_URL);

const env = { NODE_ENV: process.env.NODE_ENV || 'production' };
if (configured) {
  env.APP_PUBLIC_ORIGIN = configured;
  env.PUBLIC_APP_URL = configured;
}

const body =
  'window.process = Object.assign({}, window.process, { env: Object.assign({}, (window.process && window.process.env) || {}, ' +
  JSON.stringify(env) +
  ') });\n';

const distPath = path.join(process.cwd(), 'dist', 'runtime-env.js');
const distDir = path.dirname(distPath);
if (!fs.existsSync(distDir)) {
  console.warn('write-runtime-env: dist/ missing — skip (run after ng build)');
  process.exit(0);
}
fs.writeFileSync(distPath, body);
console.log('write-runtime-env: wrote', distPath, configured ? `origin=${configured}` : 'origin=(browser fallback)');
