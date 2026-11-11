import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { toasts, clearAllToasts } from '@/lib/stores/toastStore';
import { getCurrentDateISO } from '@/lib/utils/date';

type Globals = Record<string, unknown>;
const GLOBAL_KEYS = [
  'window',
  'document',
  'Event',
  'CustomEvent',
  'HTMLElement',
  'HTMLDialogElement',
  'setTimeout',
  'clearTimeout',
];

function callArgs(fn: unknown, call = 0): unknown[] {
  return (fn as { mock: { calls: unknown[][] } }).mock.calls[call];
}

const occurrence = (dueDate: string) =>
  JSON.stringify({
    id: 'occ-1',
    due_date: dueDate,
    templateName: 'Rent',
    templateType: 'expense',
    templateAmount: '1500000',
    currency: 'IDR',
    category: { id: 'cat-1', name: 'Housing' },
    account: { id: 'acc-1', name: 'Checking' },
  });

const MARKUP = `
  <button type="button" data-open-confirm-modal data-testid="confirm"></button>
  <button type="button" data-open-skip-modal data-testid="skip"></button>
  <dialog id="recurring-confirm-modal">
    <form method="post" id="recurring-confirm-form">
      <input type="hidden" name="occurrence_id" />
      <h2 data-modal-title></h2>
      <p data-modal-subtitle></p>
      <div class="hidden" data-confirm-error></div>
      <input type="text" name="amount" />
      <p data-original-amount></p>
      <input type="date" name="transaction_date" />
      <select name="category_id"><option value="cat-1">Housing</option></select>
      <select name="account_id"><option value="acc-1">Checking</option></select>
      <button type="button" data-confirm-cancel>Cancel</button>
      <button type="submit" data-confirm-submit>Confirm</button>
    </form>
  </dialog>
  <dialog id="recurring-skip-modal">
    <div class="hidden" data-confirm-error></div>
    <p data-skip-template-name></p>
    <textarea data-skip-reason></textarea>
    <span data-skip-counter></span>
    <button type="button" data-confirm-cancel>Cancel</button>
    <button type="button" data-confirm-action>Skip</button>
  </dialog>
`;

describe('bindOccurrenceActions', () => {
  let saved: Globals;
  let originalFetch: typeof fetch;
  let win: Window;
  let controller: AbortController;
  let fetchMock: ReturnType<typeof mock>;
  let bindOccurrenceActions: typeof import('./recurring-occurrence-actions.client').bindOccurrenceActions;

  const $ = <T extends Element>(selector: string) =>
    win.document.querySelector(selector) as unknown as T;

  async function flush() {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(async () => {
    saved = Object.fromEntries(GLOBAL_KEYS.map((key) => [key, (globalThis as Globals)[key]]));
    originalFetch = globalThis.fetch;

    win = new Window({ url: 'http://localhost/recurring' });
    (win as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;
    Object.assign(globalThis as Globals, {
      window: win,
      document: win.document,
      Event: win.Event,
      CustomEvent: win.CustomEvent,
      HTMLElement: win.HTMLElement,
      HTMLDialogElement: win.HTMLDialogElement,
      setTimeout: win.setTimeout.bind(win),
      clearTimeout: win.clearTimeout.bind(win),
    });

    fetchMock = mock(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    clearAllToasts();

    win.document.body.innerHTML = MARKUP;
    ({ bindOccurrenceActions } = await import('./recurring-occurrence-actions.client'));
    controller = new AbortController();
  });

  afterEach(async () => {
    controller.abort();
    await win.happyDOM.abort();
    Object.assign(globalThis as Globals, saved);
    globalThis.fetch = originalFetch;
    clearAllToasts();
  });

  function bind(overrides: Partial<Parameters<typeof bindOccurrenceActions>[0]> = {}) {
    const onMutated = mock();
    bindOccurrenceActions({
      signal: controller.signal,
      onMutated,
      dateLabel: (_occ, date) => `Due on ${date}`,
      notDueWarning: (action) => `Not yet: ${action}`,
      ...overrides,
    });
    return onMutated;
  }

  function trigger(testId: 'confirm' | 'skip', dueDate: string) {
    const button = $<HTMLElement>(`[data-testid="${testId}"]`);
    button.setAttribute('data-occurrence', occurrence(dueDate));
    button.click();
  }

  it('warns instead of opening the modal when the occurrence is not due yet', () => {
    bind();

    trigger('confirm', '2999-01-01');

    expect($<HTMLDialogElement>('#recurring-confirm-modal').open).toBe(false);
    expect(toasts.get().at(-1)).toMatchObject({ type: 'warning', message: 'Not yet: confirm' });
  });

  it('fills the confirm form and posts the stripped amount', async () => {
    const onMutated = bind();
    const today = getCurrentDateISO();

    trigger('confirm', today);

    expect($<HTMLDialogElement>('#recurring-confirm-modal').open).toBe(true);
    expect($<HTMLElement>('[data-modal-title]').textContent).toBe('Confirm Rent');
    expect($<HTMLElement>('[data-modal-subtitle]').textContent).toStartWith('Due on ');
    expect($<HTMLInputElement>('input[name="occurrence_id"]').value).toBe('occ-1');
    expect($<HTMLInputElement>('input[name="transaction_date"]').value).toBe(today);

    $<HTMLButtonElement>('[data-confirm-submit]').click();
    await flush();

    const [url, init] = callArgs(fetchMock) as [string, RequestInit];
    expect(url).toBe('/api/recurring/occurrences/occ-1/confirm');
    expect(JSON.parse(String(init.body))).toEqual({
      amount: '1500000',
      transaction_date: today,
      category_id: 'cat-1',
      account_id: 'acc-1',
    });
    expect(onMutated).toHaveBeenCalledWith('Occurrence confirmed');
    expect($<HTMLDialogElement>('#recurring-confirm-modal').open).toBe(false);
  });

  it('shows the API error in the confirm modal and does not report success', async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: { message: 'Account is closed' } }), { status: 422 })
    );
    const onMutated = bind();

    trigger('confirm', getCurrentDateISO());
    $<HTMLButtonElement>('[data-confirm-submit]').click();
    await flush();

    expect(onMutated).not.toHaveBeenCalled();
    expect($<HTMLElement>('#recurring-confirm-modal [data-confirm-error]').textContent).toBe(
      'Account is closed'
    );
    expect(toasts.get().at(-1)).toMatchObject({ type: 'error', message: 'Account is closed' });
  });

  it('skips with the trimmed reason', async () => {
    const onMutated = bind();

    trigger('skip', getCurrentDateISO());
    expect($<HTMLElement>('[data-skip-template-name]').textContent).toBe('Skip Rent?');

    const reason = $<HTMLTextAreaElement>('[data-skip-reason]');
    reason.value = '  paid in cash  ';
    reason.dispatchEvent(new win.Event('input') as unknown as Event);
    expect($<HTMLElement>('[data-skip-counter]').textContent).toBe('16 / 200 characters');

    $<HTMLButtonElement>('#recurring-skip-modal [data-confirm-action]').click();
    await flush();

    const [url, init] = callArgs(fetchMock) as [string, RequestInit];
    expect(url).toBe('/api/recurring/occurrences/occ-1/skip');
    expect(JSON.parse(String(init.body))).toEqual({ skip_reason: 'paid in cash' });
    expect(onMutated).toHaveBeenCalledWith('Occurrence skipped');
  });

  it('keeps trigger clicks from reaching window listeners only when isolated', () => {
    const windowClick = mock();
    win.addEventListener('click', windowClick);

    bind();
    trigger('skip', '2999-01-01');
    expect(windowClick).toHaveBeenCalledTimes(1);

    controller.abort();
    controller = new AbortController();
    bind({ isolateTriggerClicks: true });
    trigger('skip', '2999-01-01');
    expect(windowClick).toHaveBeenCalledTimes(1);
  });

  it('removes its listeners when the signal aborts', () => {
    bind();
    controller.abort();

    trigger('confirm', getCurrentDateISO());

    expect($<HTMLDialogElement>('#recurring-confirm-modal').open).toBe(false);
  });
});
