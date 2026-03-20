import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';

describe('AccountSearch client behavior', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalEvent: typeof globalThis.Event | undefined;
  let originalKeyboardEvent: typeof globalThis.KeyboardEvent | undefined;
  let originalHTMLElement: typeof globalThis.HTMLElement | undefined;
  let originalHTMLInputElement: typeof globalThis.HTMLInputElement | undefined;
  let originalCSS: typeof globalThis.CSS | undefined;
  let initAccountSearch: typeof import('./AccountSearch.client').initAccountSearch;

  beforeEach(async () => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalEvent = globalThis.Event;
    originalKeyboardEvent = globalThis.KeyboardEvent;
    originalHTMLElement = globalThis.HTMLElement;
    originalHTMLInputElement = globalThis.HTMLInputElement;
    originalCSS = globalThis.CSS;

    const window = new Window({ url: 'http://localhost/accounts' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).Event = window.Event;
    (globalThis as Record<string, unknown>).KeyboardEvent = window.KeyboardEvent;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;
    (globalThis as Record<string, unknown>).CSS = {
      escape: (value: string) => value,
    };

    document.body.innerHTML = `
      <div data-account-filter-controls data-default-view="card">
        <div data-view-toggle></div>
      </div>
      <input type="search" data-account-search value="" />
      <div data-view="card" class="hidden">
        <div data-account-row="card-1" data-account-name="checking"></div>
      </div>
      <div data-view="table">
        <table>
          <tbody>
            <tr data-account-table-row="table-1" data-account-name="savings"></tr>
            <tr data-account-table-row="table-2" data-account-name="brokerage"></tr>
          </tbody>
        </table>
      </div>
      <div data-account-search-no-results class="hidden"></div>
    `;

    ({ initAccountSearch } = await import('./AccountSearch.client'));
  });

  afterEach(() => {
    document.dispatchEvent(new Event('astro:before-swap'));
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).Event = originalEvent;
    (globalThis as Record<string, unknown>).KeyboardEvent = originalKeyboardEvent;
    (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = originalHTMLInputElement;
    (globalThis as Record<string, unknown>).CSS = originalCSS;
  });

  async function waitForDebounce() {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  it('filters rows inside the visible table view only', async () => {
    initAccountSearch();

    const input = document.querySelector('[data-account-search]') as HTMLInputElement | null;
    const savingsRow = document.querySelector('[data-account-table-row="table-1"]');
    const brokerageRow = document.querySelector('[data-account-table-row="table-2"]');
    const cardRow = document.querySelector('[data-account-row="card-1"]');

    if (!input || !savingsRow || !brokerageRow || !cardRow) {
      throw new Error('Expected search DOM to be present');
    }

    input.value = 'sav';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForDebounce();

    expect(savingsRow.classList.contains('hidden')).toBe(false);
    expect(brokerageRow.classList.contains('hidden')).toBe(true);
    expect(cardRow.classList.contains('hidden')).toBe(false);
  });

  it('shows no results when the visible table view has no matching rows', async () => {
    initAccountSearch();

    const input = document.querySelector('[data-account-search]') as HTMLInputElement | null;
    const noResults = document.querySelector('[data-account-search-no-results]');

    if (!input || !noResults) {
      throw new Error('Expected search input and no results element');
    }

    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForDebounce();

    expect(noResults.classList.contains('hidden')).toBe(false);
  });
});
