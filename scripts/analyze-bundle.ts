#!/usr/bin/env bun

/**
 * Bundle budget check: gzipped JS each page loads on first paint, from the built
 * script graph. Prints a Markdown report and exits 1 when a page is over budget.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, posix } from 'path';
import { gzipSync } from 'zlib';

// From .claude/rules/principles.md ("Bundle budget: 250 kB gzipped client JS").
export const PAGE_BUDGET_BYTES = 250 * 1024;

export interface PageReport {
  route: string;
  component: string;
  initialBytes: number;
  lazyBytes: number;
  chunkCount: number;
}

export interface BundleAnalysis {
  pages: PageReport[];
  decimalLeakChunks: string[];
  overBudget: PageReport[];
}

interface RouteInfo {
  routeData: { type: string; route: string; component: string; origin?: string };
  scripts: Array<{ type: string; value: string }>;
}

interface AstroManifest {
  routes: RouteInfo[];
  entryModules: Record<string, string>;
}

const STATIC_IMPORT =
  /\b(?:import|export)\s*(?:[\w$*{}\s,]*?\bfrom\s*)?["'`](\.{1,2}\/[^"'`]+)["'`]/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*\)/g;
const RENDER_SCRIPT = /renderScript\(\$\$result,\s*"([^"]+)"\)/g;
const DECIMAL_MARKER = /(?:from\s*['"]decimal\.js['"]|[/"']decimal\.js(?:[/"']|$))/i;

export function findImports(source: string): { staticImports: string[]; dynamicImports: string[] } {
  return {
    staticImports: [...source.matchAll(STATIC_IMPORT)].map((match) => match[1]),
    dynamicImports: [...source.matchAll(DYNAMIC_IMPORT)].map((match) => match[1]),
  };
}

export function findRenderedScripts(source: string): string[] {
  return [...source.matchAll(RENDER_SCRIPT)].map((match) => match[1]);
}

/** Pulls the serialized route manifest out of the server build (the `deserializeManifest({...})` call). */
export function readAstroManifest(serverChunksDir: string): AstroManifest {
  const marker = 'deserializeManifest({';
  for (const name of readdirSync(serverChunksDir).filter((file) => file.endsWith('.mjs'))) {
    const source = readFileSync(join(serverChunksDir, name), 'utf-8');
    const callStart = source.indexOf(marker);
    if (callStart === -1) continue;
    const jsonStart = callStart + marker.length - 1;
    const jsonEnd = source.indexOf('});', jsonStart);
    return JSON.parse(source.slice(jsonStart, jsonEnd + 1)) as AstroManifest;
  }
  throw new Error(`Astro manifest not found in ${serverChunksDir}. Did the build change shape?`);
}

/** Visits every file reachable through static imports, starting from `entries` (paths relative to `root`). */
export function walkStaticGraph(
  entries: string[],
  readFile: (relativePath: string) => string,
  onFile?: (relativePath: string, source: string) => void
): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFile(file);
    onFile?.(file, source);
    for (const specifier of findImports(source).staticImports) {
      queue.push(posix.join(posix.dirname(file), specifier));
    }
  }
  return seen;
}

function pageEntryKey(component: string): string {
  return `\u0000virtual:astro:page:${component.replace(/\.(astro|md|mdx|html)$/, '@_@$1')}`;
}

function createCachedReader(root: string): (relativePath: string) => string {
  const cache = new Map<string, string>();
  return (relativePath) => {
    let source = cache.get(relativePath);
    if (source === undefined) {
      const absolutePath = join(root, relativePath);
      source = existsSync(absolutePath) ? readFileSync(absolutePath, 'utf-8') : '';
      cache.set(relativePath, source);
    }
    return source;
  };
}

export function analyzeBuild(distDir: string, budgetBytes = PAGE_BUDGET_BYTES): BundleAnalysis {
  const serverDir = join(distDir, 'server');
  const clientDir = join(distDir, 'client');
  if (!existsSync(join(clientDir, '_astro'))) {
    throw new Error('Client build not found. Run `bun run build` first.');
  }

  const manifest = readAstroManifest(join(serverDir, 'chunks'));
  const readServer = createCachedReader(serverDir);
  const readClient = createCachedReader(clientDir);
  const gzipCache = new Map<string, number>();
  const gzipSize = (file: string): number => {
    let size = gzipCache.get(file);
    if (size === undefined) {
      size = gzipSync(readClient(file)).length;
      gzipCache.set(file, size);
    }
    return size;
  };
  const sumGzip = (files: Iterable<string>): number =>
    [...files].reduce((total, file) => total + gzipSize(file), 0);

  const pages: PageReport[] = [];
  let renderedScriptCount = 0;
  for (const { routeData, scripts } of manifest.routes) {
    if (routeData.type !== 'page' || routeData.origin === 'internal') continue;

    const serverEntry = manifest.entryModules[pageEntryKey(routeData.component)];
    if (!serverEntry) {
      throw new Error(`No server chunk for ${routeData.component}. Did the build change shape?`);
    }

    const clientEntries = new Set<string>();
    for (const script of scripts) {
      if (script.type === 'external') clientEntries.add(script.value.replace(/^\//, ''));
    }
    // Over-counts components that render conditionally, so the number is an upper bound.
    walkStaticGraph([serverEntry], readServer, (file, source) => {
      for (const scriptId of findRenderedScripts(source)) {
        const clientFile = manifest.entryModules[scriptId];
        // A silent skip would let every page pass at a few kB, so fail loudly instead.
        if (!clientFile) throw new Error(`Script ${scriptId} (from ${file}) has no client chunk.`);
        clientEntries.add(clientFile);
        renderedScriptCount++;
      }
    });

    const dynamicEntries = new Set<string>();
    const initialFiles = walkStaticGraph([...clientEntries], readClient, (file, source) => {
      for (const specifier of findImports(source).dynamicImports) {
        dynamicEntries.add(posix.join(posix.dirname(file), specifier));
      }
    });
    const lazyFiles = [...walkStaticGraph([...dynamicEntries], readClient)].filter(
      (file) => !initialFiles.has(file)
    );

    pages.push({
      route: routeData.route,
      component: routeData.component,
      initialBytes: sumGzip(initialFiles),
      lazyBytes: sumGzip(lazyFiles),
      chunkCount: initialFiles.size,
    });
  }

  if (renderedScriptCount === 0) {
    throw new Error(
      'No renderScript() calls found in the server build. Did the build change shape?'
    );
  }

  pages.sort((a, b) => b.initialBytes - a.initialBytes || a.route.localeCompare(b.route));

  const astroDir = join(clientDir, '_astro');
  const decimalLeakChunks = readdirSync(astroDir)
    .filter((name) => name.endsWith('.js'))
    .filter((name) => DECIMAL_MARKER.test(readFileSync(join(astroDir, name), 'utf-8')));

  return {
    pages,
    decimalLeakChunks,
    overBudget: pages.filter((page) => page.initialBytes > budgetBytes),
  };
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

export function renderReport(analysis: BundleAnalysis, budgetBytes = PAGE_BUDGET_BYTES): string {
  const failed = analysis.overBudget.length > 0 || analysis.decimalLeakChunks.length > 0;
  const lines = [
    '## Bundle Size Report',
    '',
    `Gzipped JS each page loads on first paint, against a ${formatKb(budgetBytes)} per-page budget. ` +
      'Lazy is code behind dynamic `import()`, loaded on demand and not counted against the budget.',
    '',
    failed ? '**Result: over budget**' : '**Result: every page is within budget**',
    '',
    '| Page | Initial JS | Budget | Lazy JS | Chunks |',
    '| ---- | ---------: | -----: | ------: | -----: |',
  ];

  for (const page of analysis.pages) {
    const usage = Math.round((page.initialBytes / budgetBytes) * 100);
    const flag = page.initialBytes > budgetBytes ? ' **over**' : '';
    lines.push(
      `| \`${page.route}\` | ${formatKb(page.initialBytes)} | ${usage}%${flag} | ${formatKb(page.lazyBytes)} | ${page.chunkCount} |`
    );
  }

  if (analysis.overBudget.length > 0) {
    lines.push('', '### Over budget', '');
    for (const page of analysis.overBudget) {
      lines.push(
        `- \`${page.route}\` (${page.component}) loads ${formatKb(page.initialBytes)}, ${formatKb(page.initialBytes - budgetBytes)} over.`
      );
    }
  }

  if (analysis.decimalLeakChunks.length > 0) {
    lines.push('', '### Decimal.js in client bundle', '');
    lines.push('Decimal.js is server-only. Use `import type` for its types in client code.', '');
    for (const chunk of analysis.decimalLeakChunks) lines.push(`- \`${chunk}\``);
  }

  return `${lines.join('\n')}\n`;
}

if (import.meta.main) {
  try {
    const analysis = analyzeBuild(join(process.cwd(), 'dist'));
    process.stdout.write(renderReport(analysis));
    const failed = analysis.overBudget.length > 0 || analysis.decimalLeakChunks.length > 0;
    process.exit(failed ? 1 : 0);
  } catch (error) {
    process.stderr.write(`Error analyzing bundle: ${String(error)}\n`);
    process.exit(2);
  }
}
