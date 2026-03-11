import { afterEach, describe, expect, it, mock } from 'bun:test';

describe('captcha client helpers', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { turnstile?: unknown }).turnstile;
  });

  it('reads the current Turnstile token from a form', async () => {
    const { getCaptchaToken } = await import(
      `./captcha-client?test=${Date.now()}-${Math.random()}`
    );
    const form = {
      elements: [
        {
          name: 'cf-turnstile-response',
          value: 'token-123',
        },
      ],
    } as unknown as HTMLFormElement;

    expect(getCaptchaToken(form)).toBe('token-123');
  });

  it('returns empty headers when no Turnstile token is present', async () => {
    const { buildCaptchaHeaders } = await import(
      `./captcha-client?test=${Date.now()}-${Math.random()}`
    );
    const form = {
      elements: [],
    } as unknown as HTMLFormElement;

    expect(buildCaptchaHeaders(form)).toEqual({});
  });

  it('returns x-captcha-response when a Turnstile token is present', async () => {
    const { buildCaptchaHeaders } = await import(
      `./captcha-client?test=${Date.now()}-${Math.random()}`
    );
    const form = {
      elements: [
        {
          name: 'cf-turnstile-response',
          value: 'token-456',
        },
      ],
    } as unknown as HTMLFormElement;

    expect(buildCaptchaHeaders(form)).toEqual({
      'x-captcha-response': 'token-456',
    });
  });

  it('detects when a Turnstile widget is present on the form', async () => {
    const { hasCaptchaWidget } = await import(
      `./captcha-client?test=${Date.now()}-${Math.random()}`
    );
    const form = {
      querySelector(selector: string) {
        return selector === '.cf-turnstile' ? {} : null;
      },
    } as unknown as HTMLFormElement;

    expect(hasCaptchaWidget(form)).toBe(true);
  });

  it('safely resets the Turnstile widget when available', async () => {
    const reset = mock(() => {});
    (globalThis as any).turnstile = {
      reset,
    };

    const { resetCaptchaWidget } = await import(
      `./captcha-client?test=${Date.now()}-${Math.random()}`
    );

    resetCaptchaWidget();

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
