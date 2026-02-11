#!/usr/bin/env bun

/**
 * Bundle Size Analyzer
 * Parses the rollup-plugin-visualizer JSON output and generates a markdown report
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TreeNode {
  name: string;
  uid?: string;
  children?: TreeNode[];
}

interface NodePart {
  renderedLength: number;
  gzipLength: number;
  brotliLength?: number;
  metaUid?: string;
}

interface BundleStats {
  version: number;
  tree: TreeNode;
  nodeParts: Record<string, NodePart>;
  nodeMetas: Record<string, unknown>;
}

interface ChunkInfo {
  name: string;
  gzipSize: number;
  renderedSize: number;
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

function sumTreeSizes(
  node: TreeNode,
  nodeParts: Record<string, NodePart>
): { gzip: number; rendered: number } {
  let gzip = 0;
  let rendered = 0;

  // If this node has a uid, get its size from nodeParts
  if (node.uid && nodeParts[node.uid]) {
    const part = nodeParts[node.uid];
    gzip = part.gzipLength || 0;
    rendered = part.renderedLength || 0;
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      const childSizes = sumTreeSizes(child, nodeParts);
      gzip += childSizes.gzip;
      rendered += childSizes.rendered;
    }
  }

  return { gzip, rendered };
}

function extractChunks(
  node: TreeNode,
  nodeParts: Record<string, NodePart>,
  pattern?: RegExp
): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];

  // Check if this node is a chunk (has children and optionally matches pattern)
  if (node.children && (!pattern || pattern.test(node.name))) {
    const sizes = sumTreeSizes(node, nodeParts);
    chunks.push({
      name: node.name,
      gzipSize: sizes.gzip,
      renderedSize: sizes.rendered,
    });
  }

  // Recurse into children if we're at root level
  if (node.children && node.name === 'root') {
    for (const child of node.children) {
      chunks.push(...extractChunks(child, nodeParts, pattern));
    }
  }

  return chunks;
}

/**
 * Find library sizes inside node_modules directories matching a pattern.
 * Only matches package directories that are direct children of node_modules,
 * then sums ALL descendants of matching packages.
 */
function findLibrarySize(
  node: TreeNode,
  nodeParts: Record<string, NodePart>,
  pattern: RegExp
): number {
  let totalGzip = 0;

  if (node.name === 'node_modules' && node.children) {
    // Inside node_modules — check direct children (package names) against pattern
    for (const pkg of node.children) {
      if (pkg.name && pattern.test(pkg.name)) {
        totalGzip += sumTreeSizes(pkg, nodeParts).gzip;
      }
    }
  } else if (node.children) {
    // Keep searching for node_modules directories deeper in the tree
    for (const child of node.children) {
      totalGzip += findLibrarySize(child, nodeParts, pattern);
    }
  }

  return totalGzip;
}

interface LibraryBreakdown {
  name: string;
  size: number;
}

/**
 * Analyze a chunk to find what libraries it contains
 */
function analyzeChunkContents(
  node: TreeNode,
  nodeParts: Record<string, NodePart>
): LibraryBreakdown[] {
  const libraries = new Map<string, number>();

  function sumNodeSize(n: TreeNode): number {
    let total = 0;
    if (n.uid && nodeParts[n.uid]) {
      total += nodeParts[n.uid].gzipLength || 0;
    }
    if (n.children) {
      n.children.forEach((child) => {
        total += sumNodeSize(child);
      });
    }
    return total;
  }

  function traverse(n: TreeNode, inNodeModules: boolean = false) {
    // If we're directly under node_modules, this is a library root
    if (inNodeModules && n.name) {
      // Handle scoped packages (@org/package) and regular packages
      const isScope = n.name.startsWith('@');
      if (isScope) {
        // For scoped packages, we need to look at children
        if (n.children) {
          n.children.forEach((child) => {
            const libName = `${n.name}/${child.name}`;
            const size = sumNodeSize(child);
            if (size > 0) {
              libraries.set(libName, (libraries.get(libName) || 0) + size);
            }
          });
        }
      } else {
        // Regular package
        const size = sumNodeSize(n);
        if (size > 0) {
          libraries.set(n.name, (libraries.get(n.name) || 0) + size);
        }
      }
      return; // Don't traverse deeper, we've handled this library
    }

    // Check if this is the node_modules folder
    if (n.name === 'node_modules' && n.children) {
      n.children.forEach((child) => traverse(child, true));
      return;
    }

    // Continue traversing
    if (n.children) {
      n.children.forEach((child) => traverse(child, inNodeModules));
    }
  }

  traverse(node);

  return Array.from(libraries.entries())
    .map(([name, size]) => ({ name, size }))
    .sort((a, b) => b.size - a.size);
}

function findChunksByPattern(
  tree: TreeNode,
  nodeParts: Record<string, NodePart>,
  pattern: RegExp
): ChunkInfo[] {
  return extractChunks(tree, nodeParts, pattern);
}

function analyzeBundle(): string {
  const statsPath = join(process.cwd(), 'dist', 'stats.json');

  if (!existsSync(statsPath)) {
    throw new Error('Bundle stats not found. Run `bun run build` first.');
  }

  const stats: BundleStats = JSON.parse(readFileSync(statsPath, 'utf-8'));

  // Extract all chunks
  const allChunks = extractChunks(stats.tree, stats.nodeParts);

  // Filter client chunks (those in _astro directory)
  const clientChunks = allChunks.filter((chunk) => chunk.name.includes('_astro/'));

  // Calculate total client JS size
  const totalGzipSize = clientChunks.reduce((sum, chunk) => sum + chunk.gzipSize, 0);
  const totalRenderedSize = clientChunks.reduce((sum, chunk) => sum + chunk.renderedSize, 0);

  // Find specific library sizes by searching all nodes at any depth
  const chartjsSize = findLibrarySize(stats.tree, stats.nodeParts, /chart/i);
  const motionSize = findLibrarySize(stats.tree, stats.nodeParts, /motion/i);
  const decimalSize = findLibrarySize(stats.tree, stats.nodeParts, /decimal/i);

  // Generate markdown report
  let report = '## 📊 Bundle Size Report\n\n';

  report += '### Summary\n\n';
  report += '| Category | Size (gzipped) | Budget | Usage | Status |\n';
  report += '|----------|----------------|--------|-------|--------|\n';
  report += `| **Total Client JS** | ${formatBytes(totalGzipSize)} | ${formatBytes(BUDGET_LIMITS.total)} | ${getPercentage(totalGzipSize, BUDGET_LIMITS.total)} | ${getStatus(totalGzipSize, BUDGET_LIMITS.total)} |\n`;
  report += `| Chart.js | ${formatBytes(chartjsSize)} | ${formatBytes(BUDGET_LIMITS.chartjs)} | ${getPercentage(chartjsSize, BUDGET_LIMITS.chartjs)} | ${getStatus(chartjsSize, BUDGET_LIMITS.chartjs)} |\n`;
  report += `| Motion | ${formatBytes(motionSize)} | ${formatBytes(BUDGET_LIMITS.motion)} | ${getPercentage(motionSize, BUDGET_LIMITS.motion)} | ${getStatus(motionSize, BUDGET_LIMITS.motion)} |\n`;

  // Check for Decimal.js in client bundle (should be 0)
  if (decimalSize > 0) {
    report += `| ⚠️ Decimal.js | ${formatBytes(decimalSize)} | 0 kB | N/A | 🔴 **SHOULD NOT BE IN CLIENT** |\n`;
  }

  report += '\n### Top 10 Client Chunks\n\n';
  report += '| Chunk | Size (gzipped) | Size (rendered) |\n';
  report += '|-------|----------------|----------------|\n';

  // List top 10 largest client chunks
  const sortedChunks = clientChunks.sort((a, b) => b.gzipSize - a.gzipSize).slice(0, 10);

  for (const chunk of sortedChunks) {
    // Clean up chunk name to show just the file
    const fileName = chunk.name.split('/').pop() || chunk.name;
    report += `| \`${fileName}\` | ${formatBytes(chunk.gzipSize)} | ${formatBytes(chunk.renderedSize)} |\n`;
  }

  // Add breakdown for large chunks (> 50 kB)
  const largeChunks = stats.tree.children?.filter((child) => {
    if (!child.name.includes('_astro/')) return false;
    const sizes = sumTreeSizes(child, stats.nodeParts);
    return sizes.gzip > 50 * 1024; // 50 kB threshold
  });

  if (largeChunks && largeChunks.length > 0) {
    report += '\n### 📦 Large Chunk Breakdown (>50 kB)\n\n';
    for (const chunk of largeChunks) {
      const fileName = chunk.name.split('/').pop() || chunk.name;
      const sizes = sumTreeSizes(chunk, stats.nodeParts);
      const libraries = analyzeChunkContents(chunk, stats.nodeParts);

      report += `**${fileName}** (${formatBytes(sizes.gzip)} gzipped)\n\n`;

      if (libraries.length > 0) {
        report += '| Library | Size (gzipped) | % of Chunk |\n';
        report += '|---------|----------------|------------|\n';

        const topLibs = libraries.slice(0, 5);
        for (const lib of topLibs) {
          const percentage = Math.round((lib.size / sizes.gzip) * 100);
          report += `| \`${lib.name}\` | ${formatBytes(lib.size)} | ${percentage}% |\n`;
        }

        if (libraries.length > 5) {
          const otherSize = libraries.slice(5).reduce((sum, l) => sum + l.size, 0);
          const otherPercentage = Math.round((otherSize / sizes.gzip) * 100);
          report += `| _Other libraries_ | ${formatBytes(otherSize)} | ${otherPercentage}% |\n`;
        }

        report += '\n';
      }
    }
  }

  // Add warnings section
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

  if (decimalSize > 0) {
    warnings.push(
      `🔴 **CRITICAL: Decimal.js found in client bundle (${formatBytes(decimalSize)})**`
    );
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

// Run the analyzer
try {
  const report = analyzeBundle();
  // eslint-disable-next-line no-console
  console.log(report);
  process.exit(0);
} catch (error) {
  console.error('Error analyzing bundle:', error);
  process.exit(1);
}
