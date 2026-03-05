#!/usr/bin/env bun

/**
 * Bundle Size Analyzer
 *
 * IMPORTANT:
 * This reports ACTUAL emitted client JS gzip sizes from dist/client/_astro/*.js.
 * We intentionally avoid summing stats.json nodeParts.gzipLength because that is
 * module-level and can overcount compared to shipped chunk files.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

interface ChunkInfo {
  name: string;
  rawSize: number;
  gzipSize: number;
}

const BUDGET_LIMITS = {
  total: 250 * 1024, // 250 kB
  chartjs: 180 * 1024, // 180 kB
  motion: 60 * 1024, // 60 kB
};

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function getStatus(actual: number, limit: number): string {
  const percentage = (actual / limit) * 100;
  if (percentage > 100) return '🔴 Over Budget';
  if (percentage > 90) return '🟡 Near Limit';
  return '✅ Under Budget';
}

function getPercentage(actual: number, limit: number): string {
  const percentage = Math.round((actual / limit) * 100);
  return `${percentage}%`;
}

function loadClientChunks(astroDir: string): ChunkInfo[] {
  const jsFiles = readdirSync(astroDir).filter((name) => name.endsWith('.js'));

  return jsFiles.map((name) => {
    const filePath = join(astroDir, name);
    const content = readFileSync(filePath);

    return {
      name,
      rawSize: content.length,
      gzipSize: gzipSync(content).length,
    };
  });
}

function sumByPattern(chunks: ChunkInfo[], pattern: RegExp): number {
  return chunks
    .filter((chunk) => pattern.test(chunk.name))
    .reduce((sum, chunk) => sum + chunk.gzipSize, 0);
}

function hasPotentialDecimalLeak(astroDir: string, chunks: ChunkInfo[]): boolean {
  const decimalPattern = /(?:from\s*['"]decimal\.js['"]|[/"']decimal\.js(?:[/"']|$))/i;

  return chunks.some((chunk) => {
    const filePath = join(astroDir, chunk.name);
    const content = readFileSync(filePath, 'utf-8');
    return decimalPattern.test(content);
  });
}

function analyzeBundle(): string {
  const distDir = join(process.cwd(), 'dist');
  const clientDir = join(distDir, 'client');
  const astroDir = join(clientDir, '_astro');

  if (!existsSync(astroDir)) {
    throw new Error('Client build not found. Run `bun run build` first.');
  }

  const clientChunks = loadClientChunks(astroDir);
  const sortedChunks = [...clientChunks].sort((a, b) => b.gzipSize - a.gzipSize);

  const totalGzipSize = clientChunks.reduce((sum, chunk) => sum + chunk.gzipSize, 0);

  // Match manual chunk names from astro.config.ts
  const chartjsSize = sumByPattern(clientChunks, /^chartjs\..*\.js$/);
  const motionSize = sumByPattern(clientChunks, /^motion\..*\.js$/);
  const hasDecimalLeak = hasPotentialDecimalLeak(astroDir, clientChunks);

  let report = '## 📊 Bundle Size Report\n\n';
  report += '> Measured from emitted files in `dist/client/_astro/*.js` (actual gzip bytes)\n\n';

  report += '### Summary\n\n';
  report += '| Category | Size (gzipped) | Budget | Usage | Status |\n';
  report += '|----------|----------------|--------|-------|--------|\n';
  report += `| **Total Client JS** | ${formatBytes(totalGzipSize)} | ${formatBytes(BUDGET_LIMITS.total)} | ${getPercentage(totalGzipSize, BUDGET_LIMITS.total)} | ${getStatus(totalGzipSize, BUDGET_LIMITS.total)} |\n`;
  report += `| Chart.js | ${formatBytes(chartjsSize)} | ${formatBytes(BUDGET_LIMITS.chartjs)} | ${getPercentage(chartjsSize, BUDGET_LIMITS.chartjs)} | ${getStatus(chartjsSize, BUDGET_LIMITS.chartjs)} |\n`;
  report += `| Motion | ${formatBytes(motionSize)} | ${formatBytes(BUDGET_LIMITS.motion)} | ${getPercentage(motionSize, BUDGET_LIMITS.motion)} | ${getStatus(motionSize, BUDGET_LIMITS.motion)} |\n`;

  if (hasDecimalLeak) {
    report += '| ⚠️ Decimal.js | detected | 0 kB | N/A | 🔴 **SHOULD NOT BE IN CLIENT** |\n';
  }

  report += '\n### Top 10 Client Chunks\n\n';
  report += '| Chunk | Size (gzipped) | Size (raw) |\n';
  report += '|-------|----------------|------------|\n';

  for (const chunk of sortedChunks.slice(0, 10)) {
    report += `| \`${chunk.name}\` | ${formatBytes(chunk.gzipSize)} | ${formatBytes(chunk.rawSize)} |\n`;
  }

  const largeChunks = sortedChunks.filter((chunk) => chunk.gzipSize > 50 * 1024);
  if (largeChunks.length > 0) {
    report += '\n### 📦 Large Chunk Breakdown (>50 kB)\n\n';
    for (const chunk of largeChunks) {
      report += `- \`${chunk.name}\`: ${formatBytes(chunk.gzipSize)} gzipped (${formatBytes(chunk.rawSize)} raw)\n`;
    }
  }

  const warnings: string[] = [];

  if (totalGzipSize > BUDGET_LIMITS.total) {
    warnings.push(
      `⚠️ **Total client bundle exceeds budget by ${formatBytes(totalGzipSize - BUDGET_LIMITS.total)}**`
    );
  }

  if (chartjsSize > BUDGET_LIMITS.chartjs) {
    warnings.push(
      `⚠️ **Chart.js exceeds budget by ${formatBytes(chartjsSize - BUDGET_LIMITS.chartjs)}**`
    );
  }

  if (motionSize > BUDGET_LIMITS.motion) {
    warnings.push(
      `⚠️ **Motion exceeds budget by ${formatBytes(motionSize - BUDGET_LIMITS.motion)}**`
    );
  }

  if (hasDecimalLeak) {
    warnings.push('🔴 **CRITICAL: Decimal.js marker found in client bundle**');
    warnings.push('  - Decimal.js should only be used on the server');
    warnings.push('  - Use `import type` for Decimal.js types in client code');
  }

  if (warnings.length > 0) {
    report += '\n### ⚠️ Warnings\n\n';
    for (const warning of warnings) {
      report += `- ${warning}\n`;
    }
  } else {
    report += '\n### ✅ All Checks Passed\n\n';
    report += 'All bundle size limits are within budget!\n';
  }

  report += '\n---\n';
  report += `\n<sub>📈 Generated by [bundle-size workflow](${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || 'owner/repo'}/actions/runs/${process.env.GITHUB_RUN_ID || '0'}) | View [detailed visualization](../actions/runs/${process.env.GITHUB_RUN_ID || '0'}) in artifacts</sub>\n`;

  return report;
}

try {
  const report = analyzeBundle();
  console.log(report);
  process.exit(0);
} catch (error) {
  console.error('Error analyzing bundle:', error);
  process.exit(1);
}
