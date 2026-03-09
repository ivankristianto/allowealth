import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import { clearAllToasts, toasts } from '@/lib/stores/toastStore';

describe('ManageAppearancesForm client behavior', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalEvent: typeof globalThis.Event | undefined;
  let originalHTMLElement: typeof globalThis.HTMLElement | undefined;
  let originalHTMLInputElement: typeof globalThis.HTMLInputElement | undefined;
  let originalAbortController: typeof globalThis.AbortController | undefined;
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalEvent = globalThis.Event;
    originalHTMLElement = globalThis.HTMLElement;
    originalHTMLInputElement = globalThis.HTMLInputElement;
    originalAbortController = globalThis.AbortController;
    originalFetch = globalThis.fetch;

    const window = new Window({ url: 'http://localhost/profile' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) =>
        ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }) as unknown as MediaQueryList,
      configurable: true,
      writable: true,
    });

    document.documentElement.setAttribute('data-theme', 'light');
    document.body.innerHTML = `
      <fieldset id="appearances-form" data-current-theme="system">
        <input type="radio" name="theme" value="system" checked />
        <input type="radio" name="theme" value="light" />
        <input type="radio" name="theme" value="dark" />
        <input type="radio" name="theme" value="monochrome" />
      </fieldset>
    `;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).Event = window.Event;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;
    (globalThis as Record<string, unknown>).AbortController = window.AbortController;

    clearAllToasts();
  });

  afterEach(() => {
    clearAllToasts();
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).Event = originalEvent;
    (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    (globalThis as Record<string, unknown>).HTMLInputElement = originalHTMLInputElement;
    (globalThis as Record<string, unknown>).AbortController = originalAbortController;
    (globalThis as Record<string, unknown>).fetch = originalFetch;
  });

  async function loadModule() {
    return import('./ManageAppearancesForm.client');
  }

  async function flush() {
    await Promise.resolve();
    await Promise.resolve();
  }

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }

  it('applies the selected dark theme and saves it', async () => {
    let request: [RequestInfo | URL, RequestInit | undefined] | undefined;
    (globalThis as Record<string, unknown>).fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      request = [input, init];
      return new Response(JSON.stringify({ success: true }));
    };
    const { initAppearancesForm } = await loadModule();

    initAppearancesForm();

    const darkRadio = document.querySelector<HTMLInputElement>('input[value="dark"]');
    if (!darkRadio) throw new Error('Expected dark radio');

    darkRadio.checked = true;
    darkRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(request).toBeDefined();

    const [url, init] = request as [string, RequestInit];
    expect(url).toBe('/api/user/theme');
    expect(init.method).toBe('PUT');
    expect(init.credentials).toBe('include');
    expect(init.body).toBe(JSON.stringify({ theme: 'dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-server')).toBe('true');
    expect(toasts.get().at(-1)?.message).toBe('Theme updated');
  });

  it('applies monochrome with a grayscale filter', async () => {
    (globalThis as Record<string, unknown>).fetch = async () =>
      new Response(JSON.stringify({ success: true }));
    const { initAppearancesForm } = await loadModule();

    initAppearancesForm();

    const radio = document.querySelector<HTMLInputElement>('input[value="monochrome"]');
    if (!radio) throw new Error('Expected monochrome radio');

    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.filter).toBe('grayscale(100%)');
    expect(document.documentElement.getAttribute('data-theme-server')).toBe('true');
  });

  it('reverts the previous theme when saving fails', async () => {
    const form = document.getElementById('appearances-form');
    if (!form) throw new Error('Expected appearances form');

    form.setAttribute('data-current-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-theme-server', 'true');

    (globalThis as Record<string, unknown>).fetch = async () =>
      new Response(JSON.stringify({ success: false }), {
        status: 500,
      });

    const { initAppearancesForm } = await loadModule();
    initAppearancesForm();

    const lightRadio = document.querySelector<HTMLInputElement>('input[value="light"]');
    const darkRadio = document.querySelector<HTMLInputElement>('input[value="dark"]');
    if (!lightRadio || !darkRadio) throw new Error('Expected theme radios');

    lightRadio.checked = true;
    lightRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(form.getAttribute('data-current-theme')).toBe('dark');
    expect(darkRadio.checked).toBe(true);
    expect(lightRadio.checked).toBe(false);
    expect(toasts.get().at(-1)?.message).toBe('Failed to save theme preference');
  });

  it('keeps the latest selection when earlier saves finish later', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    let requestCount = 0;

    (globalThis as Record<string, unknown>).fetch = async () => {
      requestCount += 1;
      return requestCount === 1 ? firstResponse.promise : secondResponse.promise;
    };

    const { initAppearancesForm } = await loadModule();
    initAppearancesForm();

    const darkRadio = document.querySelector<HTMLInputElement>('input[value="dark"]');
    const lightRadio = document.querySelector<HTMLInputElement>('input[value="light"]');
    const form = document.getElementById('appearances-form');
    if (!darkRadio || !lightRadio || !form) throw new Error('Expected theme form and radios');

    darkRadio.checked = true;
    darkRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    lightRadio.checked = true;
    lightRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    secondResponse.resolve(new Response(JSON.stringify({ success: true })));
    await flush();

    firstResponse.resolve(
      new Response(JSON.stringify({ success: false }), {
        status: 500,
      })
    );
    await flush();

    expect(form.getAttribute('data-current-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(lightRadio.checked).toBe(true);
    expect(toasts.get().at(-1)?.message).toBe('Theme updated');
  });
});
