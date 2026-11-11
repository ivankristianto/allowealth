/**
 * WealthTrajectory Tests
 *
 * Verifies chart window scoping and guards against script cleanup regressions.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { ForecastChartWindow, ForecastTimelinePoint } from '@/lib/forecast';

import { buildWealthTrajectoryChartSeries } from './WealthTrajectory.client';

const sourcePath = fileURLToPath(new URL('./WealthTrajectory.astro', import.meta.url));
const source = readFileSync(sourcePath, 'utf-8');
const clientSourcePath = fileURLToPath(new URL('./WealthTrajectory.client.ts', import.meta.url));
const clientSource = readFileSync(clientSourcePath, 'utf-8');

const sampleTimeline: ForecastTimelinePoint[] = [
  {
    key: '2025-01',
    dateLabel: 'Jan 2025',
    actualBalance: 8_500_000,
    plannedBalance: 8_600_000,
    currentTrajectoryBalance: 8_550_000,
    forecastInterest: 45_000,
    actualNetSavings: 300_000,
    income: 4_000_000,
    expenses: 3_700_000,
  },
  {
    key: '2025-02',
    dateLabel: 'Feb 2025',
    actualBalance: 8_950_000,
    plannedBalance: 9_100_000,
    currentTrajectoryBalance: 9_000_000,
    forecastInterest: 48_000,
    actualNetSavings: 320_000,
    income: 4_100_000,
    expenses: 3_780_000,
  },
  {
    key: '2025-03',
    dateLabel: 'Mar 2025',
    actualBalance: null,
    plannedBalance: 9_650_000,
    currentTrajectoryBalance: 9_420_000,
    forecastInterest: 52_000,
    actualNetSavings: null,
    income: null,
    expenses: null,
  },
];

describe('WealthTrajectory chart series builder', () => {
  it('limits chart series to the focused chart window', () => {
    const chartWindow: ForecastChartWindow = {
      startIndex: 1,
      endIndex: 2,
      startKey: '2025-02',
      endKey: '2025-03',
      latestActualKey: '2025-02',
    };

    const series = buildWealthTrajectoryChartSeries(sampleTimeline, chartWindow);

    expect(series.labels).toEqual(['Feb 2025', 'Mar 2025']);
    expect(series.plannedBalance).toEqual([9_100_000, 9_650_000]);
    expect(series.actualBalance).toEqual([8_950_000, null]);
    expect(series.currentTrajectoryBalance).toEqual([9_000_000, 9_420_000]);
  });

  it('uses the full timeline when no focused chart window is present', () => {
    const chartWindow: ForecastChartWindow = {
      startIndex: 0,
      endIndex: -1,
      startKey: null,
      endKey: null,
      latestActualKey: '2025-02',
    };

    const series = buildWealthTrajectoryChartSeries(sampleTimeline, chartWindow);

    expect(series.labels).toEqual(['Jan 2025', 'Feb 2025', 'Mar 2025']);
    expect(series.plannedBalance).toEqual([8_600_000, 9_100_000, 9_650_000]);
  });
});

describe('WealthTrajectory reality-check chart', () => {
  it('uses chart window metadata to scope the default viewport', () => {
    expect(source).toContain('chartWindow');
    expect(clientSource).toContain('startIndex');
    expect(clientSource).toContain('endIndex');
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
