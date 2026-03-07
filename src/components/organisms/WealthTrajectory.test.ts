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
const clientSourcePath = fileURLToPath(new URL('./WealthTrajectory.client.ts', import.meta.url));
const clientSource = readFileSync(clientSourcePath, 'utf-8');

describe('WealthTrajectory chart lifecycle cleanup', () => {
  it('should not include unused observer declarations', () => {
    expect(source).not.toContain('let chartObserver');
    expect(source).not.toContain('let themeObserver');
    expect(source).not.toContain('let systemThemeMediaQuery');
  });
});

describe('WealthTrajectory reality-check chart', () => {
  it('renders the approved legend labels', () => {
    expect(source).toContain('Planned Balance');
    expect(source).toContain('Actual Balance');
    expect(source).toContain('Current Trajectory');
  });

  it('does not render inline assumption controls', () => {
    expect(source).not.toContain('data-wealth-trajectory-controls');
    expect(source).not.toContain('MONTHLY TOP-UP');
    expect(source).not.toContain('EXPECTED APY');
  });

  it('uses chart window metadata to scope the default viewport', () => {
    expect(source).toContain('chartWindow');
    expect(clientSource).toContain('startIndex');
    expect(clientSource).toContain('endIndex');
  });

  it('renders current trajectory with a dashed stroke', () => {
    expect(source).toContain('borderDash');
    expect(source).toContain('Current Trajectory');
  });
});
