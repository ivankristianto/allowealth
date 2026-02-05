/**
 * WealthTrajectory Script Cleanup Tests
 *
 * Ensures unused observer variables are removed after chart lifecycle refactor.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('./WealthTrajectory.astro', import.meta.url));
const source = readFileSync(sourcePath, 'utf-8');

describe('WealthTrajectory chart lifecycle cleanup', () => {
  it('should not include unused observer declarations', () => {
    expect(source).not.toContain('let chartObserver');
    expect(source).not.toContain('let themeObserver');
    expect(source).not.toContain('let systemThemeMediaQuery');
  });
});
