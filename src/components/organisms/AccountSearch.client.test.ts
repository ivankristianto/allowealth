import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';

describe('AccountSearch client behavior', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalEvent: typeof globalThis.Event | undefined;
  let originalKeyboardEvent: typeof globalThis.KeyboardEvent | undefined;
  let originalHTMLElement: typeof globalThis.HTMLElement | undefined;
  let originalHTMLInputElement: typeof globalThis.HTMLInputElement | undefined;
  let originalHTMLTableRowElement: typeof globalThis.HTMLTableRowElement | undefined;
  let originalCSS: typeof globalThis.CSS | undefined;
  let originalLocalStorage: typeof globalThis.localStorage | undefined;
  let initAccountSearch: typeof import('./AccountSearch.client').initAccountSearch;
  let initAccountsTableClient: typeof import('./accounts-table.client').initAccountsTableClient;

  beforeEach(async () => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalEvent = globalThis.Event;
    originalKeyboardEvent = globalThis.KeyboardEvent;
    originalHTMLElement = globalThis.HTMLElement;
    originalHTMLInputElement = globalThis.HTMLInputElement;
    originalHTMLTableRowElement = globalThis.HTMLTableRowElement;
    originalCSS = globalThis.CSS;
    originalLocalStorage = globalThis.localStorage;

    const window = new Window({ url: 'http://localhost/accounts' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).Event = window.Event;
    (globalThis as Record<string, unknown>).KeyboardEvent = window.KeyboardEvent;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;
    (globalThis as Record<string, unknown>).HTMLTableRowElement = window.HTMLTableRowElement;
    (globalThis as Record<string, unknown>).CSS = {
      escape: (value: string) => value,
    };

    document.body.innerHTML = `
      <section data-account-page>
        <div data-account-filter-controls data-default-view="table">
          <div data-view-toggle>
            <button type="button" data-view-mode="card" aria-pressed="false"></button>
            <button type="button" data-view-mode="table" aria-pressed="true"></button>
          </div>
        </div>
        <input type="search" data-account-search value="" />
        <div data-view="card" class="hidden">
          <div data-account-row="card-1" data-account-name="checking"></div>
          <div data-account-row="card-2" data-account-name="savings"></div>
        </div>
        <div data-view="table">
          <table data-account-table>
            <tbody>
              <tr data-group-header="liquid"></tr>
              <tr
                data-account-table-row="table-1"
                data-account-name="savings"
                data-sort-name="savings"
                data-sort-type="bank"
                data-sort-category="cash"
                data-sort-owner="ivan"
                data-sort-balance="100"
                data-sort-updated="100"
              ></tr>
              <tr class="hidden" data-history-wrapper data-account-id="table-1">
                <td>
                  <div data-history-container data-account-id="table-1"></div>
                </td>
              </tr>
              <tr
                data-account-table-row="table-2"
                data-account-name="brokerage"
                data-sort-name="brokerage"
                data-sort-type="stock"
                data-sort-category="investments"
                data-sort-owner="ivan"
                data-sort-balance="50"
                data-sort-updated="50"
              ></tr>
              <tr class="hidden" data-history-wrapper data-account-id="table-2">
                <td>
                  <div data-history-container data-account-id="table-2"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div data-account-search-no-results class="hidden"></div>
      </section>
    `;

    ({ initAccountSearch } = await import('./AccountSearch.client'));
    ({ initAccountsTableClient } = await import('./accounts-table.client'));
  });

  afterEach(() => {
    document.dispatchEvent(new Event('astro:before-swap'));
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).Event = originalEvent;
    (globalThis as Record<string, unknown>).KeyboardEvent = originalKeyboardEvent;
    (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = originalHTMLInputElement;
    (globalThis as Record<string, unknown>).HTMLTableRowElement = originalHTMLTableRowElement;
    (globalThis as Record<string, unknown>).CSS = originalCSS;
    (globalThis as Record<string, unknown>).localStorage = originalLocalStorage;
  });

  async function waitForDebounce() {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  it('filters rows inside the visible table view only', async () => {
    initAccountSearch();

    const input = document.querySelector('[data-account-search]') as HTMLInputElement | null;
    const savingsRow = document.querySelector('[data-account-table-row="table-1"]');
    const brokerageRow = document.querySelector('[data-account-table-row="table-2"]');
    const savingsHistory = document.querySelector(
      '[data-history-wrapper][data-account-id="table-1"]'
    );
    const brokerageHistory = document.querySelector(
      '[data-history-wrapper][data-account-id="table-2"]'
    );
    const cardRow = document.querySelector('[data-account-row="card-1"]');

    if (
      !input ||
      !savingsRow ||
      !brokerageRow ||
      !savingsHistory ||
      !brokerageHistory ||
      !cardRow
    ) {
      throw new Error('Expected search DOM to be present');
    }

    input.value = 'sav';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForDebounce();

    expect(savingsRow.classList.contains('hidden')).toBe(false);
    expect(brokerageRow.classList.contains('hidden')).toBe(true);
    // History wrappers start hidden and search never force-shows them;
    // non-matching rows get hidden added, matching rows keep existing state.
    expect(savingsHistory.classList.contains('hidden')).toBe(true);
    expect(brokerageHistory.classList.contains('hidden')).toBe(true);
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

  it('reapplies the active search query after switching views', async () => {
    initAccountSearch();
    initAccountsTableClient();

    const input = document.querySelector('[data-account-search]') as HTMLInputElement | null;
    const cardButton = document.querySelector(
      '[data-view-mode="card"]'
    ) as HTMLButtonElement | null;
    const cardSavingsRow = document.querySelector('[data-account-row="card-2"]');
    const cardCheckingRow = document.querySelector('[data-account-row="card-1"]');

    if (!input || !cardButton || !cardSavingsRow || !cardCheckingRow) {
      throw new Error('Expected search and toggle DOM to be present');
    }

    input.value = 'sav';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForDebounce();

    cardButton.click();
    await waitForDebounce();

    expect(cardSavingsRow.classList.contains('hidden')).toBe(false);
    expect(cardCheckingRow.classList.contains('hidden')).toBe(true);
  });

  it('restores hidden table rows after clearing search in another view', async () => {
    initAccountSearch();
    initAccountsTableClient();

    const input = document.querySelector('[data-account-search]') as HTMLInputElement | null;
    const cardButton = document.querySelector(
      '[data-view-mode="card"]'
    ) as HTMLButtonElement | null;
    const tableButton = document.querySelector(
      '[data-view-mode="table"]'
    ) as HTMLButtonElement | null;
    const savingsRow = document.querySelector('[data-account-table-row="table-1"]');
    const brokerageRow = document.querySelector('[data-account-table-row="table-2"]');
    const savingsHistory = document.querySelector(
      '[data-history-wrapper][data-account-id="table-1"]'
    );
    const brokerageHistory = document.querySelector(
      '[data-history-wrapper][data-account-id="table-2"]'
    );

    if (
      !input ||
      !cardButton ||
      !tableButton ||
      !savingsRow ||
      !brokerageRow ||
      !savingsHistory ||
      !brokerageHistory
    ) {
      throw new Error('Expected search and view toggle DOM to be present');
    }

    input.value = 'sav';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForDebounce();

    expect(savingsRow.classList.contains('hidden')).toBe(false);
    expect(brokerageRow.classList.contains('hidden')).toBe(true);
    // History wrappers start hidden; search never force-shows them
    expect(savingsHistory.classList.contains('hidden')).toBe(true);
    expect(brokerageHistory.classList.contains('hidden')).toBe(true);

    cardButton.click();
    await waitForDebounce();

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForDebounce();

    tableButton.click();
    await waitForDebounce();

    expect(savingsRow.classList.contains('hidden')).toBe(false);
    expect(brokerageRow.classList.contains('hidden')).toBe(false);
    // History wrappers remain hidden — only the inline-history toggle shows them
    expect(savingsHistory.classList.contains('hidden')).toBe(true);
    expect(brokerageHistory.classList.contains('hidden')).toBe(true);
  });
});
