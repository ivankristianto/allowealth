import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'bun:test';

function findTestFiles(dir: string, root = dir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const matches: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      matches.push(...findTestFiles(fullPath, root));
      continue;
    }

    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
      matches.push(relative(root, fullPath));
    }
  }

  return matches;
}

describe('src/pages route hygiene', () => {
  it('does not keep test files under src/pages where Astro will build them as routes', () => {
    const testFiles = findTestFiles(join(process.cwd(), 'src/pages'));

    expect(testFiles).toEqual([]);
  });
});
