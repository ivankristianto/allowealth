/**
 * WealthTrajectory Tests
 *
 * Verifies client-side summary updates and guards against script cleanup regressions.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { formatCurrency } from '@/lib/formatting';

const sourcePath = fileURLToPath(new URL('./WealthTrajectory.astro', import.meta.url));
const source = readFileSync(sourcePath, 'utf-8');

describe('WealthTrajectory client formatting', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalFetch: typeof globalThis.fetch | undefined;
  let originalNavigator: Navigator | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalFetch = globalThis.fetch;
    originalNavigator = globalThis.navigator;

    const window = new Window({ url: 'http://localhost/forecast' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).navigator = window.navigator;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;
    (globalThis as Record<string, unknown>).CustomEvent = window.CustomEvent;
    (globalThis as Record<string, unknown>).Event = window.Event;

    document.body.innerHTML = `
      <section role="region">
        <div data-wealth-trajectory-controls>
          <input name="monthlyTopup" value="5000000" />
          <input name="annualRate" value="7" />
        </div>
        <div data-chart-id="chart-1" data-currency="IDR"></div>
        <div class="grid">
          <div><h3>—</h3></div>
          <div><h3>—</h3></div>
          <div><h3>—</h3></div>
        </div>
      </section>
    `;

    (
      window as unknown as { wealthTrajectoryCharts: Record<string, unknown> }
    ).wealthTrajectoryCharts = {
      'chart-1': {
        chart: {
          data: {
            labels: [],
            datasets: [{ data: [] }, { data: [] }],
          },
          update: mock(() => {}),
        },
        data: [],
      },
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).navigator = originalNavigator;
    (globalThis as Record<string, unknown>).fetch = originalFetch;
  });

  it('updates live summary cards with full currency values after forecast refresh', async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            dataPoints: [
              {
                key: '2025-01',
                dateLabel: 'Jan 2025',
                forecastBalance: 12_500_000,
                forecastInterest: 450_000,
                realBalance: 11_800_000,
                realInterest: 400_000,
              },
            ],
            summary: {
              year10Target: 12_500_000,
              totalInterest: 3_500_000,
              growthMultiple: 2.5,
              currentTotal: 5_000_000,
            },
            input: {
              monthlyTopup: 5_000_000,
              annualRate: 7.5,
              years: 10,
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
    (globalThis as Record<string, unknown>).fetch = fetchMock;

    const { initWealthTrajectoryInputs } = await import('./WealthTrajectory.client');
    initWealthTrajectoryInputs();

    const apyInput = document.querySelector('input[name="annualRate"]') as HTMLInputElement | null;
    if (!apyInput) throw new Error('Expected annualRate input in test DOM');

    apyInput.value = '7.5';
    apyInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 650));

    const cards = document.querySelectorAll('.grid > div');
    const year10Value = cards[0]?.querySelector('h3')?.textContent;
    const totalInterestValue = cards[1]?.querySelector('h3')?.textContent;
    const firstFetchUrl = (fetchMock as any).mock.calls[0]?.[0];

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstFetchUrl).toContain('/api/forecast?monthlyTopup=5000000&annualRate=7.5&years=10');
    expect(year10Value).toBe(formatCurrency(12_500_000, 'IDR'));
    expect(totalInterestValue).toBe(formatCurrency(3_500_000, 'IDR'));
    expect(year10Value).not.toContain('Rp12.5M');
    expect(totalInterestValue).not.toContain('Rp3.5M');
  });
});

describe('WealthTrajectory chart lifecycle cleanup', () => {
  it('should not include unused observer declarations', () => {
    expect(source).not.toContain('let chartObserver');
    expect(source).not.toContain('let themeObserver');
    expect(source).not.toContain('let systemThemeMediaQuery');
  });
});
