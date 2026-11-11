import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Window } from 'happy-dom';

type Globals = Record<string, unknown>;

// bun-types leaves `.mock` off Mock<any>, so read recorded calls through this.
function callArg(fn: unknown, call = 0): unknown {
  return (fn as { mock: { calls: unknown[][] } }).mock.calls[call][0];
}
// Timers run on the happy-dom window so afterEach can cancel the screen reader cleanup
// timer before `document` is restored.
const GLOBAL_KEYS = [
  'window',
  'document',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'HTMLElement',
  'setTimeout',
  'clearTimeout',
];

describe('createReportPage', () => {
  let saved: Globals;
  let originalFetch: typeof fetch;
  let win: Window;
  let fetchMock: ReturnType<typeof mock>;
  let createReportPage: typeof import('./report-page.client').createReportPage;
  let openCategoryDrillDown: typeof import('./report-page.client').openCategoryDrillDown;

  function setResponse(html: string, ok = true) {
    fetchMock.mockImplementation(
      async () => new Response(html, { status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Boom' })
    );
  }

  function requestedParams(call: number): URLSearchParams {
    const url = String(callArg(fetchMock, call));
    return new URL(url, 'http://localhost').searchParams;
  }

  function requestedPath(call: number): string {
    return new URL(String(callArg(fetchMock, call)), 'http://localhost').pathname;
  }

  async function flush() {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(async () => {
    saved = Object.fromEntries(GLOBAL_KEYS.map((key) => [key, (globalThis as Globals)[key]]));
    originalFetch = globalThis.fetch;

    win = new Window({ url: 'http://localhost/reports/income?range=monthly&period=2026-03' });
    (win as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;
    const globals = globalThis as Globals;
    globals.window = win;
    globals.document = win.document;
    globals.Event = win.Event;
    globals.CustomEvent = win.CustomEvent;
    globals.MouseEvent = win.MouseEvent;
    globals.HTMLElement = win.HTMLElement;
    globals.setTimeout = win.setTimeout.bind(win);
    globals.clearTimeout = win.clearTimeout.bind(win);

    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    win.document.body.innerHTML = `
      <h1 data-header-subtitle></h1>
      <div data-report-page="income" data-api-endpoint="/api/reports/income" data-current-currency="USD">
        <div data-summary-container></div>
        <div data-history-container></div>
        <button type="button" data-view-details data-category-id="cat-1" data-category-name="Salary" data-spent="250" data-budget-limit="">Details</button>
      </div>
    `;

    ({ createReportPage, openCategoryDrillDown } = await import('./report-page.client'));
  });

  afterEach(async () => {
    win.document.dispatchEvent(new win.Event('astro:before-swap'));
    await win.happyDOM.abort();
    Object.assign(globalThis as Globals, saved);
    globalThis.fetch = originalFetch;
  });

  function createIncomePage(overrides: Partial<Parameters<typeof createReportPage>[0]> = {}) {
    const renderSummary = mock();
    const renderHistory = mock();
    const page = createReportPage({
      selector: '[data-report-page="income"]',
      endpoint: '/api/reports/fallback',
      partials: [
        { name: 'summary', container: '[data-summary-container]', render: renderSummary },
        { name: 'history', container: '[data-history-container]', render: renderHistory },
      ],
      messages: { updated: 'income report updated', loadError: 'Failed to load income data.' },
      ...overrides,
    });
    return { page, renderSummary, renderHistory };
  }

  it('reads range, period and currency on init and labels the header', () => {
    const { page } = createIncomePage();

    expect(page.state).toEqual({ range: 'monthly', period: '2026-03', currency: 'USD' });
    expect(win.document.querySelector('[data-header-subtitle]')?.textContent).toBe('March 2026');
  });

  it('fetches all partials from the page endpoint when the period changes', async () => {
    const onStateReset = mock();
    const { renderSummary, renderHistory } = createIncomePage({
      onStateReset,
      extendParams: (params) => params.set('page', '1'),
    });
    onStateReset.mockClear();
    setResponse('<!-- PARTIAL:summary -->\n<p>sum</p>\n<!-- PARTIAL:history -->\n<p>hist</p>');

    win.dispatchEvent(new win.CustomEvent('reportPeriodChange', { detail: { period: '2026-04' } }));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedPath(0)).toBe('/api/reports/income');
    const params = requestedParams(0);
    expect(params.get('_render')).toBe('html');
    expect(params.get('_partial')).toBe('all');
    expect(params.get('period')).toBe('2026-04');
    expect(params.get('currency')).toBe('USD');
    expect(params.get('page')).toBe('1');
    expect(callArg(renderSummary)).toContain('sum');
    expect(callArg(renderHistory)).toContain('hist');
    expect(onStateReset).toHaveBeenCalledTimes(1);
    expect(win.document.querySelector('[role="status"]')?.textContent).toBe(
      'Monthly income report updated'
    );
    expect(win.location.search).toContain('period=2026-04');
    expect(win.document.querySelector('[data-header-subtitle]')?.textContent).toBe('April 2026');
  });

  it('switches to yearly, reloads the selector first, then the data', async () => {
    const { page } = createIncomePage();
    setResponse('<!-- PARTIAL:summary -->\n<p>sum</p>');

    win.dispatchEvent(new win.CustomEvent('reportRangeChange', { detail: { range: 'yearly' } }));
    await flush();

    expect(page.state.period).toBe('2026');
    expect(requestedParams(0).get('_partial')).toBe('selector');
    expect(requestedParams(1).get('_partial')).toBe('all');
    expect(requestedParams(1).get('range')).toBe('yearly');
  });

  it('clears loading states when the request fails', async () => {
    const { renderSummary } = createIncomePage();
    setResponse('nope', false);

    win.dispatchEvent(new win.CustomEvent('reportPeriodChange', { detail: { period: '2026-05' } }));
    await flush();

    expect(renderSummary).not.toHaveBeenCalled();
    const summary = win.document.querySelector('[data-summary-container]');
    expect(summary?.getAttribute('aria-busy')).not.toBe('true');
  });

  it('falls back to the configured endpoint and skips pages whose root is missing', async () => {
    win.document.querySelector('[data-report-page]')?.removeAttribute('data-api-endpoint');
    createIncomePage();
    createIncomePage({ selector: '[data-report-page="overview"]', endpoint: '/api/other' });
    setResponse('');

    win.dispatchEvent(new win.CustomEvent('reportPeriodChange', { detail: { period: '2026-06' } }));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedPath(0)).toBe('/api/reports/fallback');
  });

  it('stops listening after astro:before-swap', async () => {
    createIncomePage();
    win.document.dispatchEvent(new win.Event('astro:before-swap'));

    win.dispatchEvent(new win.CustomEvent('reportPeriodChange', { detail: { period: '2026-07' } }));
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the drill-down with the current period and currency', () => {
    const opened = mock();
    win.document.addEventListener('open-category-drilldown', (event) => opened(event));
    createIncomePage({ clickHandlers: [openCategoryDrillDown] });

    (win.document.querySelector('[data-view-details]') as unknown as HTMLElement).click();

    const detail = (callArg(opened) as CustomEvent).detail;
    expect(detail).toMatchObject({
      categoryId: 'cat-1',
      categoryName: 'Salary',
      spent: 250,
      budgetLimit: null,
      period: '2026-03',
      currency: 'USD',
    });
  });
});
