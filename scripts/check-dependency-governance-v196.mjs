import fs from 'node:fs';

const fail = (message) => {
  console.error(`[V196] ${message}`);
  process.exitCode = 1;
};

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dependabot = fs.readFileSync('.github/dependabot.yml', 'utf8');

const allDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};

const angularPackages = [
  '@angular/common',
  '@angular/compiler',
  '@angular/core',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/router',
  '@angular/build',
  '@angular/cli',
  '@angular/compiler-cli',
];

const major = (range) => {
  const match = String(range ?? '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const angularMajors = new Set(
  angularPackages
    .filter((name) => allDeps[name])
    .map((name) => major(allDeps[name]))
    .filter((value) => value !== null),
);

if (angularMajors.size !== 1) {
  fail(`Angular runtime/build packages must stay on one major. Found: ${[...angularMajors].join(', ')}`);
}

const tailwind = packageJson.devDependencies?.tailwindcss;
const tailwindPostcss = packageJson.devDependencies?.['@tailwindcss/postcss'];
if (!tailwind || !tailwindPostcss || tailwind !== tailwindPostcss) {
  fail(`tailwindcss and @tailwindcss/postcss must use the same exact version. Found ${tailwind} vs ${tailwindPostcss}`);
}

const nodeTypesMajor = major(packageJson.devDependencies?.['@types/node']);
if (nodeTypesMajor !== 22) {
  fail(`@types/node must remain aligned with the Node 22 CI/runtime target until a coordinated runtime migration. Found ${packageJson.devDependencies?.['@types/node']}`);
}

const requiredPolicyFragments = [
  'frontend-toolchain:',
  '- "tailwindcss"',
  '- "@tailwindcss/postcss"',
  'dependency-name: "*"',
  'version-update:semver-major',
  'dependency-name: "pdfkit"',
  'version-update:semver-minor',
  'first-party-actions-runtime:',
  '- "actions/checkout"',
  '- "actions/setup-node"',
  '- "actions/upload-artifact"',
];

for (const fragment of requiredPolicyFragments) {
  if (!dependabot.includes(fragment)) {
    fail(`Dependabot governance contract is missing: ${fragment}`);
  }
}

if (!process.exitCode) {
  console.log('[V196] Dependency governance contract passed.');
}
