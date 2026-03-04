/**
 * Screenshot script for homepage showcase images.
 * Run: bun scripts/take-screenshots.ts
 */

/* eslint-disable no-console */

import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://main.allowealth.local:4350';
const OUT_DIR = path.join(import.meta.dir, '..', 'public', 'screenshots');

const pages = [
  { name: 'dashboard', url: '/dashboard' },
  { name: 'transactions', url: '/transactions' },
  { name: 'budget', url: '/budget' },
  { name: 'accounts', url: '/accounts' },
  { name: 'reports', url: '/reports' },
];

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

// Log in first
console.log('Logging in...');
await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'demo@example.com');
await page.fill('input[type="password"]', 'demo123456789');
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
console.log('Logged in.');

for (const { name, url } of pages) {
  console.log(`Screenshotting ${name}...`);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Hide notification banners for clean shots
  await page.addStyleTag({
    content: '.alert, [role="alert"] { display: none !important; }',
  });

  const outPath = path.join(OUT_DIR, `${name}.jpg`);
  await page.screenshot({
    path: outPath,
    type: 'jpeg',
    quality: 85,
    fullPage: false,
  });
  console.log(`  Saved → public/screenshots/${name}.jpg`);
}

await browser.close();
console.log('Done.');
