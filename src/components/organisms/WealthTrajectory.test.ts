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

  it('keeps the chart copy aligned with the reality-check spec', () => {
    expect(source).toContain('Compare planned growth against actual balances');
    expect(source).toContain('historical balances');
    expect(source).not.toContain('next decade');
  });

  it('reads chart dataset colors from theme tokens instead of hardcoded values', () => {
    expect(source).toContain('--color-accent');
    expect(source).toContain('--color-info');
    expect(source).toContain('--color-warning');
    expect(source).toContain('readThemeColor');
  });

  it('renders a screen-reader-only data table for the visible chart window', () => {
    expect(source).toContain('aria-label="Wealth trajectory data table"');
    expect(source).toContain('visibleTimeline.map');
  });

  it('serializes only the focused chart window to the client payload', () => {
    expect(source).toContain('const visibleChartWindow =');
    expect(source).toContain('timeline: visibleTimeline');
    expect(source).toContain('chartWindow: visibleChartWindow');
  });
});
