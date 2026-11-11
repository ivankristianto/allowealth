import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { analyzeBuild, findImports, renderReport } from '../../scripts/analyze-bundle';

const SCRIPT_PATH = resolve(import.meta.dir, '../../scripts/analyze-bundle.ts');

// Random base64 barely compresses, so gzip size tracks the requested size.
function incompressible(bytes: number): string {
  return `export const blob = "${randomBytes(bytes).toString('base64')}";`;
}

function writeFixture(distDir: string, dashboardChartBytes: number): void {
  const chunksDir = join(distDir, 'server', 'chunks');
  mkdirSync(chunksDir, { recursive: true });
  mkdirSync(join(distDir, 'client', '_astro'), { recursive: true });

  const layoutScript = '/src/components/Layout.astro?astro&type=script&index=0&lang.ts';
  const chartScript = '/src/components/Chart.astro?astro&type=script&index=0&lang.ts';
  const manifest = {
    routes: [
      {
        routeData: { type: 'page', route: '/dashboard', component: 'src/pages/dashboard.astro' },
        scripts: [{ type: 'external', value: '/_astro/page.js' }],
      },
      {
        routeData: { type: 'page', route: '/login', component: 'src/pages/login.astro' },
        scripts: [],
      },
      {
        routeData: { type: 'endpoint', route: '/api/x', component: 'src/pages/api/x.ts' },
        scripts: [],
      },
      {
        routeData: {
          type: 'page',
          route: '/_server-islands/[name]',
          component: '_server-islands.astro',
          origin: 'internal',
        },
        scripts: [],
      },
    ],
    entryModules: {
      '\u0000virtual:astro:page:src/pages/dashboard@_@astro': 'chunks/dashboard_A.mjs',
      '\u0000virtual:astro:page:src/pages/login@_@astro': 'chunks/login_B.mjs',
      [layoutScript]: '_astro/Layout.js',
      [chartScript]: '_astro/Chart.js',
    },
  };

  writeFileSync(
    join(chunksDir, 'server_X.mjs'),
    `function deserializeManifest(m) { return m; }\nvar _manifest = deserializeManifest(${JSON.stringify(manifest)});\n`
  );
  writeFileSync(
    join(chunksDir, 'Layout_L.mjs'),
    `export const Layout = () => renderScript($$result, "${layoutScript}");\n`
  );
  writeFileSync(
    join(chunksDir, 'dashboard_A.mjs'),
    `import { Layout } from './Layout_L.mjs';\nimport { x } from "./Chart_C.mjs";\n`
  );
  writeFileSync(
    join(chunksDir, 'Chart_C.mjs'),
    `export const x = () => renderScript($$result, "${chartScript}");\n`
  );
  writeFileSync(join(chunksDir, 'login_B.mjs'), `import { Layout } from './Layout_L.mjs';\n`);

  const client = join(distDir, 'client', '_astro');
  writeFileSync(join(client, 'page.js'), incompressible(1000));
  writeFileSync(
    join(client, 'Layout.js'),
    `import{t as e}from"./shared.js";e(),document.onclick=async()=>{await import(\`./auth.js\`)};`
  );
  writeFileSync(join(client, 'shared.js'), incompressible(2000));
  writeFileSync(join(client, 'auth.js'), incompressible(15000));
  writeFileSync(join(client, 'Chart.js'), `import"./chartjs.js";import"./shared.js";`);
  writeFileSync(join(client, 'chartjs.js'), incompressible(dashboardChartBytes));
}

describe('analyze-bundle', () => {
  let distDir: string;

  beforeEach(() => {
    distDir = join(mkdtempSync(join(tmpdir(), 'aw-bundle-')), 'dist');
  });

  afterEach(() => {
    rmSync(join(distDir, '..'), { recursive: true, force: true });
  });

  it('separates static and dynamic imports', () => {
    const source = `import{a}from"./a.js";import"./b.js";export{c}from"./c.js";import(\`./d.js\`);`;
    expect(findImports(source)).toEqual({
      staticImports: ['./a.js', './b.js', './c.js'],
      dynamicImports: ['./d.js'],
    });
  });

  it('measures each page by the scripts its component graph renders', () => {
    writeFixture(distDir, 60_000);
    const analysis = analyzeBuild(distDir, 250 * 1024);

    expect(analysis.pages.map((page) => page.route)).toEqual(['/dashboard', '/login']);
    const [dashboard, login] = analysis.pages;
    expect(dashboard.chunkCount).toBe(5);
    expect(login.chunkCount).toBe(2);
    expect(dashboard.initialBytes - login.initialBytes).toBeGreaterThan(60_000);
    // auth.js sits behind import(), so it is lazy, not initial.
    expect(login.initialBytes).toBeLessThan(5_000);
    expect(login.lazyBytes).toBeGreaterThan(15_000);
    expect(analysis.overBudget).toEqual([]);
  });

  it('flags only the page that exceeds the budget', () => {
    writeFixture(distDir, 60_000);
    const analysis = analyzeBuild(distDir, 50 * 1024);

    expect(analysis.overBudget.map((page) => page.route)).toEqual(['/dashboard']);
    expect(renderReport(analysis, 50 * 1024)).toContain('**Result: over budget**');
  });

  it('fails instead of under-counting when a rendered script has no client chunk', () => {
    writeFixture(distDir, 60_000);
    const chunk = join(distDir, 'server', 'chunks', 'Chart_C.mjs');
    writeFileSync(
      chunk,
      `export const x = () => renderScript($$result, "/src/Missing.astro?astro&type=script");\n`
    );

    expect(() => analyzeBuild(distDir)).toThrow('/src/Missing.astro');
  });

  it('fails when the server build has no rendered scripts at all', () => {
    writeFixture(distDir, 60_000);
    for (const name of ['Layout_L.mjs', 'Chart_C.mjs']) {
      writeFileSync(join(distDir, 'server', 'chunks', name), 'export const x = 1;\n');
    }

    expect(() => analyzeBuild(distDir)).toThrow('No renderScript() calls');
  });

  it('exits non-zero when a page is over the 250 kB budget', () => {
    writeFixture(distDir, 300_000);
    const result = Bun.spawnSync(['bun', 'run', SCRIPT_PATH], { cwd: join(distDir, '..') });

    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString()).toContain('`/dashboard`');
  });

  it('exits zero when every page is within budget', () => {
    writeFixture(distDir, 60_000);
    const result = Bun.spawnSync(['bun', 'run', SCRIPT_PATH], { cwd: join(distDir, '..') });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('every page is within budget');
  });
});
