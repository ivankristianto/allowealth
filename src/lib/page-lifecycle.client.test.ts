import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import { onPageReady } from './page-lifecycle.client';

describe('onPageReady', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalAbortController: typeof globalThis.AbortController | undefined;
  let testWindow: Window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalAbortController = globalThis.AbortController;

    testWindow = new Window({ url: 'http://localhost/login' });
    (globalThis as Record<string, unknown>).window = testWindow;
    (globalThis as Record<string, unknown>).document = testWindow.document;
    (globalThis as Record<string, unknown>).AbortController = testWindow.AbortController;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).AbortController = originalAbortController;
    testWindow.close();
  });

  const softNavigate = () => {
    // ClientRouter replaces <body> with the incoming page's body, then fires astro:page-load
    const newBody = testWindow.document.createElement('body');
    testWindow.document.body.replaceWith(newBody);
    testWindow.document.dispatchEvent(new testWindow.Event('astro:page-load'));
  };

  it('runs setup immediately when the document has already been parsed', () => {
    let runs = 0;
    onPageReady(() => runs++);
    expect(runs).toBe(1);
  });

  it('does not run setup twice when the initial astro:page-load fires', () => {
    let runs = 0;
    onPageReady(() => runs++);
    testWindow.document.dispatchEvent(new testWindow.Event('astro:page-load'));
    expect(runs).toBe(1);
  });

  it('re-runs setup after a soft navigation swaps the body', () => {
    let runs = 0;
    onPageReady(() => runs++);
    softNavigate();
    softNavigate();
    expect(runs).toBe(3);
  });

  it('aborts the previous run signal before re-running setup', () => {
    const signals: AbortSignal[] = [];
    onPageReady((signal) => signals.push(signal));
    softNavigate();
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });
});
