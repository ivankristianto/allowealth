import { describe, expect, test } from 'bun:test';
import {
  GOOGLE_AUTH_ALLOWED_ORIGINS,
  sanitizeClientAuthNavigationTarget,
  sanitizePostAuthRedirect,
} from './redirect';

describe('sanitizePostAuthRedirect', () => {
  test('allows relative dashboard paths with query strings', () => {
    expect(sanitizePostAuthRedirect('/dashboard?tab=security')).toBe('/dashboard?tab=security');
  });

  test('rejects protocol-relative redirects', () => {
    expect(sanitizePostAuthRedirect('//evil.example')).toBe('');
  });

  test('rejects encoded leading slash redirects', () => {
    expect(sanitizePostAuthRedirect('/%2f%2fevil.example')).toBe('');
  });

  test('rejects absolute external URLs', () => {
    expect(sanitizePostAuthRedirect('https://evil.example/steal')).toBe('');
  });
});

describe('sanitizeClientAuthNavigationTarget', () => {
  const currentOrigin = 'https://app.allowealth.com';

  test('allows same-origin absolute URLs', () => {
    expect(
      sanitizeClientAuthNavigationTarget('https://app.allowealth.com/dashboard?tab=security', {
        currentOrigin,
      })
    ).toBe('/dashboard?tab=security');
  });

  test('rejects cross-origin absolute URLs without an allowlist', () => {
    expect(
      sanitizeClientAuthNavigationTarget('https://evil.example/steal', {
        currentOrigin,
      })
    ).toBe('');
  });

  test('allows Google OAuth redirects only for configured origins', () => {
    expect(
      sanitizeClientAuthNavigationTarget(
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
        {
          currentOrigin,
          allowedExternalOrigins: GOOGLE_AUTH_ALLOWED_ORIGINS,
        }
      )
    ).toBe('https://accounts.google.com/o/oauth2/v2/auth?client_id=test');
  });

  test('rejects javascript scheme destinations', () => {
    expect(
      sanitizeClientAuthNavigationTarget('javascript:alert(1)', {
        currentOrigin,
      })
    ).toBe('');
  });
});
