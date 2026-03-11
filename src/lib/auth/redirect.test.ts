import { describe, expect, test } from 'bun:test';
import { sanitizePostAuthRedirect } from './redirect';

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
