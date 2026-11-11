import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const componentSource = readSourceIfExists('./ForecastAssumptions.astro');
const clientSource = readSourceIfExists('./ForecastAssumptions.client.ts');
const pageSource = readSourceIfExists('../../pages/forecast/index.astro');

describe('ForecastAssumptions component', () => {
  it('associates both inputs with the live status and inline error surfaces', () => {
    expect(componentSource).toContain('ariaDescribedBy');
    expect(componentSource).toContain('forecast-assumptions-status');
    expect(componentSource).toContain('forecast-assumptions-error');
    expect(clientSource).toContain('aria-invalid');
  });

  it('debounces workspace settings saves in the client script', () => {
    expect(clientSource).toContain('/api/workspace/settings');
    expect(clientSource).toContain("method: 'PUT'");
    expect(clientSource).toContain('getCsrfHeaders');
    expect(clientSource).toContain('setTimeout');
  });

  it('reuses shared assumption validation so client and server limits stay aligned', () => {
    expect(clientSource).toContain("from '@/lib/forecast/assumptions'");
    expect(clientSource).toContain('validateForecastAssumptions');
  });

  it('wires the forecast page to the assumptions card before the charts', () => {
    expect(pageSource).toContain('ForecastAssumptions');
    expect(pageSource).toContain('Reality-check forecast');
    expect(pageSource).not.toContain('monthlyTopup=5000000');
    expect(pageSource).not.toContain('annualRate=7');
    expect(pageSource).not.toContain('Spending forecast');
    expect(pageSource).not.toContain('Predict your financial future based on current accounts');
    expect(pageSource.indexOf('<ForecastAssumptions')).toBeLessThan(
      pageSource.indexOf('<WealthTrajectory')
    );
  });

  it('loads forecast data without building an internal fetch URL from request headers', () => {
    expect(pageSource).toContain('getForecastRealityCheckData');
    expect(pageSource).not.toContain('Astro.url.origin');
    expect(pageSource).not.toContain("Astro.request.headers.get('cookie')");
  });
});
