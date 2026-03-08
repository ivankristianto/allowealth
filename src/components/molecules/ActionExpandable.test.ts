import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';

type ActionExpandableWindow = Window & {
  __actionExpandableController?: AbortController;
  __actionExpandableLifecycleBound?: boolean;
};

describe('ActionExpandable client behavior', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalHTMLElement: typeof globalThis.HTMLElement | undefined;
  let originalEvent: typeof globalThis.Event | undefined;
  let originalAbortController: typeof globalThis.AbortController | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalHTMLElement = globalThis.HTMLElement;
    originalEvent = globalThis.Event;
    originalAbortController = globalThis.AbortController;

    const window = new Window({ url: 'http://localhost/budget' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).Event = window.Event;
    (globalThis as Record<string, unknown>).AbortController = window.AbortController;

    document.body.innerHTML = `
      <div data-action-expandable aria-label="More actions">
        <div class="action-expandable__visible"></div>
        <div id="expandable-test" class="action-expandable__content" data-expandable-content>
          <div class="action-expandable__content-inner">
            <button type="button" data-extra-action>Export</button>
          </div>
        </div>
        <button
          type="button"
          data-expandable-toggle
          data-expand-label="More"
          data-collapse-label="Less"
          aria-expanded="false"
          aria-controls="expandable-test"
        >
          <span data-toggle-label>More</span>
        </button>
      </div>
    `;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    (globalThis as Record<string, unknown>).Event = originalEvent;
    (globalThis as Record<string, unknown>).AbortController = originalAbortController;
  });

  it('keeps collapsed actions hidden from assistive tech and reveals them when toggled', async () => {
    const { initActionExpandables } = await import('./ActionExpandable.client');

    initActionExpandables();

    const toggle = document.querySelector('[data-expandable-toggle]') as HTMLButtonElement | null;
    const content = document.querySelector('[data-expandable-content]') as HTMLElement | null;
    const label = document.querySelector('[data-toggle-label]');

    if (!toggle || !content || !label) {
      throw new Error('Expected expandable toggle and content in test DOM');
    }

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(content.getAttribute('aria-hidden')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(true);
    expect(label.textContent).toBe('More');

    toggle.click();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(content.getAttribute('aria-hidden')).toBe('false');
    expect(content.hasAttribute('inert')).toBe(false);
    expect(content.classList.contains('is-expanded')).toBe(true);
    expect(label.textContent).toBe('Less');

    toggle.click();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(content.getAttribute('aria-hidden')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(true);
    expect(label.textContent).toBe('More');
  });

  it('registers the astro page-load lifecycle once and replaces the window-scoped controller on re-init', async () => {
    const actionWindow = window as unknown as ActionExpandableWindow;
    const originalAddEventListener = document.addEventListener.bind(document);
    const registeredEvents: string[] = [];

    document.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions | boolean
    ) => {
      registeredEvents.push(type);
      return originalAddEventListener(type, listener, options);
    }) as typeof document.addEventListener;

    const { setupActionExpandableLifecycle } = await import('./ActionExpandable.client');

    setupActionExpandableLifecycle();
    const firstController = actionWindow.__actionExpandableController;

    setupActionExpandableLifecycle();
    const secondController = actionWindow.__actionExpandableController;

    expect(registeredEvents.filter((type) => type === 'astro:page-load')).toHaveLength(1);
    expect(actionWindow.__actionExpandableLifecycleBound).toBe(true);
    expect(firstController).toBeDefined();
    expect(secondController).toBeDefined();
    expect(secondController).not.toBe(firstController);
    expect(firstController?.signal.aborted).toBe(true);
  });
});
