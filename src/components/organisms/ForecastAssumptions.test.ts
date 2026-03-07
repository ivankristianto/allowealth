import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const componentSource = readSourceIfExists('./ForecastAssumptions.astro');
const clientSource = readSourceIfExists('./ForecastAssumptions.client.ts');
const wealthTrajectorySource = readSourceIfExists('./WealthTrajectory.astro');
const pageSource = readSourceIfExists('../../pages/forecast/index.astro');

describe('ForecastAssumptions component', () => {
  it('shows the saved assumptions labels and helper copy', () => {
    expect(componentSource).toContain('Monthly Top-Up');
    expect(componentSource).toContain('Expected APY');
    expect(componentSource).toContain('saved to workspace settings');
  });

  it('renders a save-status surface', () => {
    expect(componentSource).toContain('Saving...');
    expect(componentSource).toContain('Saved');
  });

  it('debounces workspace settings saves in the client script', () => {
    expect(clientSource).toContain('/api/workspace/settings');
    expect(clientSource).toContain("method: 'PUT'");
    expect(clientSource).toContain('getCsrfHeaders');
    expect(clientSource).toContain('setTimeout');
  });

  it('wires the forecast page to the assumptions card before the charts', () => {
    expect(pageSource).toContain('ForecastAssumptions');
    expect(pageSource).not.toContain('monthlyTopup=5000000');
    expect(pageSource).not.toContain('annualRate=7');
    expect(pageSource).not.toContain('Predict your financial future based on current accounts');
    expect(pageSource.indexOf('<ForecastAssumptions')).toBeLessThan(
      pageSource.indexOf('<WealthTrajectory')
    );
  });

  it('removes the old inline assumption controls from the wealth trajectory chart', () => {
    expect(wealthTrajectorySource).not.toContain('data-wealth-trajectory-controls');
    expect(wealthTrajectorySource).not.toContain('MONTHLY TOP-UP');
    expect(wealthTrajectorySource).not.toContain('EXPECTED APY');
  });
});
