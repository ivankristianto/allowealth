import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const themeInitSource = readFileSync('public/scripts/theme-init.js', 'utf8');

describe('theme-init bootstrap script', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalLocalStorage: typeof globalThis.localStorage | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalLocalStorage = globalThis.localStorage;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).localStorage = originalLocalStorage;
  });

  function setupDom(options: {
    serverTheme?: string;
    themePreference?: string;
    savedTheme?: string | null;
    prefersDark?: boolean;
  }) {
    const window = new Window({ url: 'http://localhost' });
    const { document, localStorage } = window;
    const html = document.documentElement;

    if (options.serverTheme) {
      html.setAttribute('data-theme', options.serverTheme);
      html.setAttribute('data-theme-server', 'true');
    }

    if (options.themePreference) {
      html.setAttribute('data-theme-preference', options.themePreference);
    }

    if (options.savedTheme) {
      localStorage.setItem('theme', options.savedTheme);
    }

    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) =>
        ({
          matches:
            query === '(prefers-color-scheme: dark)' ? (options.prefersDark ?? false) : false,
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
    (globalThis as Record<string, unknown>).localStorage = localStorage;

    return { window, document, html };
  }

  function runThemeInit() {
    // Execute the public bootstrap script against the mocked DOM globals.
    new Function(themeInitSource)();
  }

  it('respects a server-set monochrome theme over localStorage', () => {
    const { html } = setupDom({
      serverTheme: 'monochrome',
      savedTheme: 'dark',
      prefersDark: false,
    });

    runThemeInit();

    expect(html.getAttribute('data-theme')).toBe('light');
    expect(html.style.filter).toBe('grayscale(100%)');
  });

  it('falls back to the OS theme when no saved preference exists', () => {
    const { html } = setupDom({ prefersDark: true });

    runThemeInit();

    expect(html.getAttribute('data-theme')).toBe('dark');
    expect(html.style.filter).toBe('');
  });

  it('ignores public localStorage when authenticated users prefer system theme', () => {
    const { html } = setupDom({
      themePreference: 'system',
      savedTheme: 'dark',
      prefersDark: false,
    });

    runThemeInit();

    expect(html.getAttribute('data-theme')).toBe('light');
    expect(html.style.filter).toBe('');
  });
});
