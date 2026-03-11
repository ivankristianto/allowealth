import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { replaceWithSanitizedHtml } from './sanitize-fragment';

describe('replaceWithSanitizedHtml', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalDOMParser: typeof globalThis.DOMParser | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalDOMParser = globalThis.DOMParser;

    const window = new Window({ url: 'http://localhost/dashboard' });
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;
    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = window.document;
    (globalThis as Record<string, unknown>).DOMParser = window.DOMParser;

    document.body.innerHTML = '<div id="target"></div>';
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).DOMParser = originalDOMParser;
  });

  test('removes scripts, inline handlers, and unsafe URL attributes', () => {
    const target = document.getElementById('target');
    if (!target) {
      throw new Error('target not found');
    }

    replaceWithSanitizedHtml(
      target,
      `
        <div id="wrapper" onclick="alert('xss')">
          <script>window.__xss = true;</script>
          <a id="bad-link" href=" java
script:alert('xss') ">Bad</a>
          <img id="bad-image" src="javascript:alert('xss')" />
          <button id="bad-button" formaction="javascript:alert('xss')">Submit</button>
          <a id="good-link" href="/dashboard?tab=security">Safe</a>
        </div>
      `
    );

    expect(target.querySelector('script')).toBeNull();
    expect(target.querySelector('#wrapper')?.getAttribute('onclick')).toBeNull();
    expect(target.querySelector('#bad-link')?.getAttribute('href')).toBeNull();
    expect(target.querySelector('#bad-image')?.getAttribute('src')).toBeNull();
    expect(target.querySelector('#bad-button')?.getAttribute('formaction')).toBeNull();
    expect(target.querySelector('#good-link')?.getAttribute('href')).toBe(
      '/dashboard?tab=security'
    );
  });
});
