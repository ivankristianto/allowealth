import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

function collectSourceFiles(directory: string): string[] {
  return readDirectory(directory);
}

function readDirectory(directory: string): string[] {
  const dirEntries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of dirEntries) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;

    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...readDirectory(entryPath));
    } else if (/(?:\.(?:astro|css|ts|tsx|js|jsx|mjs|cjs))$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function findBlurOccurrences(filePath: string): Array<{ file: string; value: string }> {
  const content = read(filePath);
  const matches = content.matchAll(
    /backdrop-blur-(?:sm|md|lg|xl|2xl|3xl)|backdrop-blur-\[[^\]]+\]|blur-(?:sm|md|lg|xl|2xl|3xl)|blur-\[[^\]]+\]|\bblur\([^\)]+\)/g
  );

  return Array.from(matches, (match) => ({
    file: relative(process.cwd(), filePath),
    value: match[0],
  }));
}

describe('mobile blur performance policy', () => {
  test('keeps persistent surfaces free of disallowed blur', () => {
    const blurOccurrences = collectSourceFiles('src')
      .flatMap(findBlurOccurrences)
      .sort((left, right) =>
        `${left.file}:${left.value}`.localeCompare(`${right.file}:${right.value}`)
      );

    expect(blurOccurrences).toEqual([
      { file: 'src/components/molecules/Drawer.astro', value: 'backdrop-blur-sm' },
      { file: 'src/components/molecules/Modal.astro', value: 'backdrop-blur-md' },
      { file: 'src/components/organisms/CategoryDrillDownModal.astro', value: 'backdrop-blur-sm' },
    ]);
  });

  test('keeps allowed transient overlays within the small blur policy', () => {
    const drawer = read('src/components/molecules/Drawer.astro');
    const modal = read('src/components/molecules/Modal.astro');
    const categoryDrillDownModal = read('src/components/organisms/CategoryDrillDownModal.astro');

    expect(drawer).toContain('backdrop-blur-sm');
    expect(modal).toContain('backdrop-blur-md');
    expect(categoryDrillDownModal).toContain('backdrop-blur-sm');
  });

  test('documents a repeatable blur audit command', () => {
    const designSystem = read('.claude/rules/frontend/design-system.md');

    expect(designSystem).toContain('## CSS Blur Performance (iOS Safari)');
    expect(designSystem).toContain('### Verification');
    expect(designSystem).toContain(
      'grep -r "backdrop-blur\\|blur-" src/ --exclude-dir=node_modules'
    );
  });
});
