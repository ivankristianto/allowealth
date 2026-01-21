/**
 * Icon Deletion Verification Test
 *
 * Historical Context:
 * This test verifies that the deprecated Icon.astro component and its stories
 * have been successfully removed from the codebase as part of the Lucide icon migration.
 *
 * Migration Summary (2026-01-21):
 * - 20 components migrated to @lucide/astro (atoms, molecules, organisms)
 * - 7 pages migrated to @lucide/astro
 * - 14 story files migrated to @lucide/astro
 * - Custom Icon.astro component: 5699 bytes deleted
 * - Custom Icon.stories.ts: 7391 bytes deleted
 *
 * The Icon component was replaced with direct @lucide/astro icon imports across
 * all components, pages, and stories following design-system/START.md Rule #7.
 *
 * Note: Comprehensive verification of Icon.astro absence is handled by individual
 * component behavior test files (*.behavior.test.ts) which test that each component
 * does NOT import from atoms/Icon.astro and does NOT use <Icon name= pattern.
 */

import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Icon Component Deletion', () => {
  const atomsDir = resolve(import.meta.dir, '../..', 'atoms');

  test('Icon.astro should not exist', () => {
    const iconAstroPath = resolve(atomsDir, 'Icon.astro');
    expect(existsSync(iconAstroPath)).toBe(false);
  });

  test('Icon.stories.ts should not exist', () => {
    const iconStoriesPath = resolve(atomsDir, 'Icon.stories.ts');
    expect(existsSync(iconStoriesPath)).toBe(false);
  });
});
