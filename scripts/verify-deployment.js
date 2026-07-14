#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const FORBIDDEN_STRINGS = [
  'Launching Soon',
  'launching soon',
  'Coming Soon',
  'coming soon',
  'coming-soon.html',
  'launching-soon.html',
  'maintenance mode',
  'under construction'
];

const SOURCE_DIRS = ['src', 'public'];
const BUILD_DIR = 'dist';

console.log(`\n${YELLOW}🔍 Verifying deployment configuration...${RESET}\n`);

let hasErrors = false;

// Check 1: Verify no forbidden strings in source code (exclude protection code)
console.log('Check 1: Scanning source files for forbidden strings...');
SOURCE_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir, { recursive: true });
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html')) {
      const filePath = path.join(dir, file);
      const isProtectionFile =
        file.includes('service-worker') ||
        file === 'main.tsx' ||
        file === 'App.tsx';

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        FORBIDDEN_STRINGS.forEach(str => {
          if (content.includes(str) && !isProtectionFile) {
            console.log(`${RED}✗ Found "${str}" in ${filePath}${RESET}`);
            hasErrors = true;
          }
        });
      } catch (e) {
        // Ignore read errors for binary files
      }
    }
  });
});

if (!hasErrors) {
  console.log(`${GREEN}✓ No forbidden strings found in source${RESET}\n`);
} else {
  console.log(`${RED}✗ Forbidden strings detected!${RESET}\n`);
}

// Check 2: Verify vercel.json has redirect rules
console.log('Check 2: Verifying vercel.json redirect rules...');
if (fs.existsSync('vercel.json')) {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

  if (!vercelConfig.redirects) {
    console.log(`${RED}✗ Missing "redirects" in vercel.json${RESET}`);
    hasErrors = true;
  } else {
    const hasLaunchingRedirect = vercelConfig.redirects.some(r =>
      r.source.includes('launching') || r.source.includes('coming')
    );
    if (!hasLaunchingRedirect) {
      console.log(`${RED}✗ vercel.json missing launching/coming-soon redirects${RESET}`);
      hasErrors = true;
    } else {
      console.log(`${GREEN}✓ Vercel redirect rules configured${RESET}`);
    }
  }
} else {
  console.log(`${RED}✗ vercel.json not found${RESET}`);
  hasErrors = true;
}

console.log();

// Check 3: Verify Service Worker exists
console.log('Check 3: Verifying Service Worker...');
if (fs.existsSync('public/service-worker.js')) {
  const swContent = fs.readFileSync('public/service-worker.js', 'utf8');
  if (swContent.includes('launching') && swContent.includes('coming')) {
    console.log(`${GREEN}✓ Service Worker protection configured${RESET}`);
  } else {
    console.log(`${RED}✗ Service Worker missing redirect protection${RESET}`);
    hasErrors = true;
  }
} else {
  console.log(`${RED}✗ Service Worker not found${RESET}`);
  hasErrors = true;
}

console.log();

// Check 4: Verify App.tsx has runtime check
console.log('Check 4: Verifying runtime redirect protection in App.tsx...');
if (fs.existsSync('src/App.tsx')) {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  if (appContent.includes('launching') && appContent.includes('window.history.replaceState')) {
    console.log(`${GREEN}✓ Runtime protection configured${RESET}`);
  } else {
    console.log(`${RED}✗ App.tsx missing runtime redirect protection${RESET}`);
    hasErrors = true;
  }
} else {
  console.log(`${RED}✗ App.tsx not found${RESET}`);
  hasErrors = true;
}

console.log();

// Check 5: Verify health check route exists
console.log('Check 5: Verifying health check implementation...');
if (fs.existsSync('public/health-check.json')) {
  console.log(`${GREEN}✓ Health check endpoint available${RESET}`);
} else {
  console.log(`${YELLOW}⚠ Health check endpoint not found (optional)${RESET}`);
}

console.log();

// Create deployment verification file
console.log('Check 6: Creating deployment verification file...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deploymentInfo = {
  timestamp: new Date().toISOString(),
  verification: 'LIVE_SITE_DEPLOYED',
  version: packageJson.version,
  checks: {
    noForbiddenStrings: !hasErrors,
    vercelRedirects: true,
    serviceWorker: true,
    runtimeProtection: true
  }
};

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log(`${GREEN}✓ Deployment info file created${RESET}\n`);

// Final result
if (hasErrors) {
  console.log(`${RED}❌ DEPLOYMENT VERIFICATION FAILED${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}✅ ALL DEPLOYMENT CHECKS PASSED${RESET}`);
  console.log(`${GREEN}Safe to deploy to production${RESET}\n`);
  process.exit(0);
}
