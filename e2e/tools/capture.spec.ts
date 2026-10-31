import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SNAPSHOT_ROUTES, routeToSlug } from './routes';
import { normalizeHtml } from './normalize';

const dir = process.env.SNAPSHOT_DIR;
if (!dir) throw new Error('SNAPSHOT_DIR must be set (e.g. "before" or "after")');

const outDir = join(process.cwd(), '.snapshots', dir);

test.describe.configure({ mode: 'serial' });

test('capture normalized HTML for every snapshot route', async ({ page }) => {
  test.setTimeout(SNAPSHOT_ROUTES.length * 15_000);
  mkdirSync(outDir, { recursive: true });

  const failures: string[] = [];

  for (const route of SNAPSHOT_ROUTES) {
    const response = await page.goto(route, { waitUntil: 'load' });
    const status = response?.status() ?? 0;

    // Record the status so a route that starts 500ing after the upgrade
    // shows up as a diff instead of silently vanishing.
    const html = await page.content();
    const body = `<!-- route: ${route} status: ${status} -->\n${normalizeHtml(html)}\n`;
    writeFileSync(join(outDir, routeToSlug(route)), body, 'utf8');

    if (status >= 500) failures.push(`${route} -> ${status}`);
  }

  if (failures.length > 0) {
    throw new Error(`Routes returned 5xx during capture:\n${failures.join('\n')}`);
  }
});
