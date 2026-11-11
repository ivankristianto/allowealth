import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';

type Globals = Record<string, unknown>;
const GLOBAL_KEYS = ['window', 'document', 'DOMParser'];

describe('calculator error messages', () => {
  let saved: Globals;
  let win: Window;
  let readErrorMessage: typeof import('./CalculatorsPage.client').readErrorMessage;

  beforeAll(async () => {
    saved = Object.fromEntries(GLOBAL_KEYS.map((key) => [key, (globalThis as Globals)[key]]));
    win = new Window({ url: 'http://localhost/calculators' });
    (win as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;
    Object.assign(globalThis as Globals, {
      window: win,
      document: win.document,
      DOMParser: win.DOMParser,
    });
    ({ readErrorMessage } = await import('./CalculatorsPage.client'));
  });

  afterAll(async () => {
    await win.happyDOM.abort();
    Object.assign(globalThis as Globals, saved);
  });

  it('reads the message from a JSON error such as a failed CSRF check', () => {
    const body = JSON.stringify({
      success: false,
      error: { message: 'CSRF token validation failed', code: 'CSRF_VALIDATION_FAILED' },
    });

    expect(readErrorMessage(body, 'application/json')).toBe('CSRF token validation failed');
  });

  it('accepts a plain string error from route-guard JSON', () => {
    expect(readErrorMessage('{"error":"Super admin access required"}', 'application/json')).toBe(
      'Super admin access required'
    );
  });

  it('reads the text of the route HTML alert', () => {
    const html =
      '<div class="alert alert-error" role="alert"><svg></svg><span>Years must be at most 50</span></div>';

    expect(readErrorMessage(html, 'text/html; charset=utf-8')).toBe('Years must be at most 50');
  });

  it('falls back when the body is empty or malformed', () => {
    expect(readErrorMessage('', 'text/html')).toBe('Calculation failed.');
    expect(readErrorMessage('not json', 'application/json')).toBe('Calculation failed.');
  });
});
