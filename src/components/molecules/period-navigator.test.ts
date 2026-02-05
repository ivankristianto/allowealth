/**
 * Period Navigator Migration Tests
 *
 * Ensures legacy month/year navigators were replaced by PeriodNavigator.
 */

import { describe, it, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const periodNavigatorPath = join(projectRoot, 'src/components/molecules/PeriodNavigator.astro');
const periodNavigatorClientPath = join(
  projectRoot,
  'src/components/molecules/PeriodNavigator.client.ts'
);

const legacyPrefixes = ['Month', 'Year'];
const legacyNavigatorPaths = legacyPrefixes.flatMap((prefix) => [
  join(projectRoot, 'src/components/molecules', `${prefix}Navigator.astro`),
  join(projectRoot, 'src/components/molecules', `${prefix}Navigator.client.ts`),
]);

describe('PeriodNavigator migration', () => {
  it('should replace legacy month/year navigators', () => {
    expect(existsSync(periodNavigatorPath)).toBe(true);
    expect(existsSync(periodNavigatorClientPath)).toBe(true);

    legacyNavigatorPaths.forEach((path) => {
      expect(existsSync(path)).toBe(false);
    });
  });
});
