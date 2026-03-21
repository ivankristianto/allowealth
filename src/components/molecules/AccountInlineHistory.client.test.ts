import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Window } from 'happy-dom';

describe('AccountInlineHistory client behavior', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalEvent: typeof globalThis.Event | undefined;
  let originalKeyboardEvent: typeof globalThis.KeyboardEvent | undefined;
  let originalHTMLElement: typeof globalThis.HTMLElement | undefined;
  let originalCSS: typeof globalThis.CSS | undefined;
  let originalFetch: typeof globalThis.fetch | undefined;
  let initInlineHistory: typeof import('./AccountInlineHistory.client').initInlineHistory;

  beforeEach(async () => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalEvent = globalThis.Event;
    originalKeyboardEvent = globalThis.KeyboardEvent;
    originalHTMLElement = globalThis.HTMLElement;
    originalCSS = globalThis.CSS;
    originalFetch = globalThis.fetch;

    const window = new Window({ url: 'http://localhost/accounts' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).Event = window.Event;
    (globalThis as Record<string, unknown>).KeyboardEvent = window.KeyboardEvent;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).CSS = {
      escape: (value: string) => value,
    };

    (globalThis as Record<string, unknown>).fetch = mock((input: RequestInfo | URL) => {
      return Promise.resolve(
        new Response(`<div class="history-fragment">${String(input)}</div>`, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );
    });

    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td>
              <button
                type="button"
                data-inline-history-toggle
                data-history-account="acc-1"
                aria-controls="account-table-history-acc-1"
                aria-expanded="false"
              >
                History
              </button>
            </td>
          </tr>
          <tr id="account-table-history-acc-1" data-history-wrapper data-account-id="acc-1" class="hidden">
            <td>
              <div data-history-container data-account-id="acc-1"></div>
            </td>
          </tr>
          <tr>
            <td>
              <button
                type="button"
                data-inline-history-toggle
                data-history-account="acc-2"
                aria-controls="account-table-history-acc-2"
                aria-expanded="false"
              >
                History
              </button>
            </td>
          </tr>
          <tr id="account-table-history-acc-2" data-history-wrapper data-account-id="acc-2" class="hidden">
            <td>
              <div data-history-container data-account-id="acc-2"></div>
            </td>
          </tr>
        </tbody>
      </table>
      <div data-account-row="card-1" data-account-id="card-1" data-account-name="Checking"></div>
      <div data-history-container data-account-id="card-1" class="hidden"></div>
    `;

    ({ initInlineHistory } = await import('./AccountInlineHistory.client'));
  });

  afterEach(() => {
    document.dispatchEvent(new Event('astro:before-swap'));
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).Event = originalEvent;
    (globalThis as Record<string, unknown>).KeyboardEvent = originalKeyboardEvent;
    (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    (globalThis as Record<string, unknown>).CSS = originalCSS;
    (globalThis as Record<string, unknown>).fetch = originalFetch;
  });

  async function waitForAsyncWork() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('expands and loads the targeted table history container', async () => {
    initInlineHistory();

    const toggle = document.querySelector(
      '[aria-controls="account-table-history-acc-1"]'
    ) as HTMLButtonElement | null;
    const wrapper = document.querySelector('#account-table-history-acc-1');
    const container = wrapper?.querySelector('[data-history-container]');

    if (!toggle || !wrapper || !container) {
      throw new Error('Expected first table history toggle, wrapper, and container');
    }

    toggle.click();
    await waitForAsyncWork();

    expect(wrapper.classList.contains('hidden')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(wrapper.querySelector('[data-history-container]')).toBe(container);
    expect(container.innerHTML).toContain('/api/accounts/acc-1/history?limit=10');
    expect(container.innerHTML).toContain('_render=html');
  });

  it('collapses the same table history container on second click', async () => {
    initInlineHistory();

    const toggle = document.querySelector(
      '[aria-controls="account-table-history-acc-1"]'
    ) as HTMLButtonElement | null;
    const wrapper = document.querySelector('#account-table-history-acc-1');
    const container = wrapper?.querySelector('[data-history-container]');

    if (!toggle || !wrapper || !container) {
      throw new Error('Expected first table history toggle, wrapper, and container');
    }

    toggle.click();
    await waitForAsyncWork();
    toggle.click();

    expect(wrapper.classList.contains('hidden')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(wrapper.querySelector('[data-history-container]')).toBe(container);
  });

  it('closes the previous table history wrapper when another account opens', async () => {
    initInlineHistory();

    const firstToggle = document.querySelector(
      '[aria-controls="account-table-history-acc-1"]'
    ) as HTMLButtonElement | null;
    const secondToggle = document.querySelector(
      '[aria-controls="account-table-history-acc-2"]'
    ) as HTMLButtonElement | null;
    const firstWrapper = document.querySelector('#account-table-history-acc-1');
    const secondWrapper = document.querySelector('#account-table-history-acc-2');
    const firstContainer = firstWrapper?.querySelector('[data-history-container]');
    const secondContainer = secondWrapper?.querySelector('[data-history-container]');

    if (
      !firstToggle ||
      !secondToggle ||
      !firstWrapper ||
      !secondWrapper ||
      !firstContainer ||
      !secondContainer
    ) {
      throw new Error('Expected both table history toggles, wrappers, and containers');
    }

    firstToggle.click();
    await waitForAsyncWork();
    secondToggle.click();
    await waitForAsyncWork();

    expect(firstWrapper.classList.contains('hidden')).toBe(true);
    expect(firstToggle.getAttribute('aria-expanded')).toBe('false');
    expect(secondWrapper.classList.contains('hidden')).toBe(false);
    expect(secondToggle.getAttribute('aria-expanded')).toBe('true');
    expect(firstWrapper.querySelector('[data-history-container]')).toBe(firstContainer);
    expect(secondWrapper.querySelector('[data-history-container]')).toBe(secondContainer);
    expect(secondContainer.innerHTML).toContain('/api/accounts/acc-2/history?limit=10');
  });

  it('preserves click-to-toggle behavior for existing card rows', async () => {
    initInlineHistory();

    const row = document.querySelector('[data-account-row="card-1"]') as HTMLElement | null;
    const container = document.querySelector(
      '[data-history-container][data-account-id="card-1"]'
    ) as HTMLElement | null;

    if (!row || !container) {
      throw new Error('Expected card row and container');
    }

    row.click();
    await waitForAsyncWork();

    expect(container.classList.contains('hidden')).toBe(false);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(container.innerHTML).toContain('/api/accounts/card-1/history?limit=10');
    expect(container.innerHTML).toContain('_render=html');
  });
});
