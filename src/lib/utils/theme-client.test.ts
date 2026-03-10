import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';

import { applyThemeToDom, getCurrentTheme, saveTheme } from './theme-client';

describe('theme-client utilities', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalFetch = globalThis.fetch;

    const window = new Window({ url: 'http://localhost/profile' });
    const { document } = window;

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

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).fetch = originalFetch;
  });

  it('reads the explicit theme preference when one is present', () => {
    document.documentElement.setAttribute('data-theme-preference', 'dark');

    expect(getCurrentTheme()).toBe('dark');
  });

  it('derives monochrome from the grayscale filter on initial load', () => {
    document.documentElement.style.filter = 'grayscale(100%)';

    expect(getCurrentTheme()).toBe('monochrome');
  });

  it('applies system theme using the current OS preference', () => {
    applyThemeToDom('system');

    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-server')).toBeNull();
    expect(document.documentElement.style.filter).toBe('');
  });

  it('persists the selected theme with the authenticated theme API', async () => {
    let request: [RequestInfo | URL, RequestInit | undefined] | undefined;
    (globalThis as Record<string, unknown>).fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      request = [input, init];
      return new Response(JSON.stringify({ success: true }));
    };

    await saveTheme('monochrome');

    expect(request).toBeDefined();
    const [url, init] = request as [string, RequestInit];
    expect(url).toBe('/api/user/theme');
    expect(init.method).toBe('PUT');
    expect(init.credentials).toBe('include');
    expect(init.body).toBe(JSON.stringify({ theme: 'monochrome' }));
  });
});
