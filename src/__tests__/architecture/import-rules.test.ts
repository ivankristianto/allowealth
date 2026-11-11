import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

// Import rules from .claude/CLAUDE.md and frontend/bundle.md, enforced instead of only documented

function importsModule(source: string, module: string): boolean {
  const escaped = module.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const quoted = `['"]${escaped}['"]`;
  return new RegExp(
    `(\\bfrom\\s*${quoted}|\\bimport\\s*${quoted}|\\bimport\\(\\s*${quoted}\\s*\\)|\\brequire\\(\\s*${quoted}\\s*\\))`
  ).test(source);
}

function importsZod(source: string): boolean {
  return importsModule(source, 'zod') || /['"]zod\/[^'"]*['"]/.test(source);
}

/** Script bodies in an .astro file; the frontmatter between --- fences runs on the server. */
function astroScripts(source: string): string[] {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

function scan(patterns: string[]): string[] {
  return patterns.flatMap((pattern) =>
    [...new Bun.Glob(pattern).scanSync({ cwd: process.cwd() })].filter(
      (path) => !path.includes('node_modules/') && !path.includes('/dist/')
    )
  );
}

const SOURCE_FILES = scan([
  'src/**/*.{ts,tsx,js,mjs,astro}',
  'apps/*/src/**/*.{ts,tsx,js,mjs,astro}',
  'e2e/**/*.ts',
  'scripts/**/*.{ts,js,mjs}',
]).filter((path) => !path.endsWith('__tests__/architecture/import-rules.test.ts'));

// Code that ships to the browser: client entry points, stores, and <script> blocks in .astro files
const CLIENT_MODULES = scan([
  'src/**/*.client.ts',
  'src/**/*-client.ts',
  'src/lib/stores/**/*.ts',
  'src/lib/client-utils.ts',
  'src/lib/utils/client.ts',
]).filter((path) => !path.endsWith('.test.ts'));

function clientSources(): Array<{ path: string; source: string }> {
  const modules = CLIENT_MODULES.map((path) => ({ path, source: readFileSync(path, 'utf8') }));
  const scripts = SOURCE_FILES.filter((path) => path.endsWith('.astro')).flatMap((path) =>
    astroScripts(readFileSync(path, 'utf8')).map((source) => ({ path, source }))
  );
  return [...modules, ...scripts];
}

describe('import rule scanners', () => {
  it('detect static, side-effect, dynamic and require imports', () => {
    expect(importsModule("import { Chart } from 'chart.js/auto';", 'chart.js/auto')).toBe(true);
    expect(importsModule('import "chart.js/auto";', 'chart.js/auto')).toBe(true);
    expect(importsModule("await import('chart.js/auto')", 'chart.js/auto')).toBe(true);
    expect(importsModule("const z = require('zod')", 'zod')).toBe(true);
    expect(importsModule("import { a } from '@/lib/utils';", '@/lib/utils')).toBe(true);
  });

  it('ignore comments, other modules and deeper paths', () => {
    expect(importsModule('// Before (chart.js/auto): 207 kB', 'chart.js/auto')).toBe(false);
    expect(importsModule("import { Chart } from 'chart.js';", 'chart.js/auto')).toBe(false);
    expect(importsModule("import { a } from '@/lib/utils/client';", '@/lib/utils')).toBe(false);
    expect(importsZod("import * as v from 'valibot';")).toBe(false);
  });

  it('catch zod subpath imports', () => {
    expect(importsZod("import { z } from 'zod/v4';")).toBe(true);
  });

  it('read only <script> bodies from .astro files', () => {
    const astro = "---\nimport { logError } from '@/lib/utils';\n---\n<script>import 'x';</script>";
    expect(astroScripts(astro)).toEqual(["import 'x';"]);
  });
});

describe('import rules', () => {
  it('finds the files it is meant to scan', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(500);
    expect(CLIENT_MODULES.length).toBeGreaterThan(50);
  });

  it('never imports chart.js/auto; register components through @/lib/chart-setup', () => {
    const offenders = SOURCE_FILES.filter((path) =>
      importsModule(readFileSync(path, 'utf8'), 'chart.js/auto')
    );
    expect(offenders).toEqual([]);
  });

  it('never imports zod; validation uses valibot', () => {
    const offenders = SOURCE_FILES.filter((path) => importsZod(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('client code never imports the @/lib/utils barrel, which pulls server code in', () => {
    const offenders = clientSources()
      .filter(({ source }) => importsModule(source, '@/lib/utils'))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
