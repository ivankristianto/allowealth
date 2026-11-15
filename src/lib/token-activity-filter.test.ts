import { describe, expect, test } from 'bun:test';
import { parseTokenActivityFilter, tokenActivityHref } from './token-activity-filter';

describe('token activity filter', () => {
  test('links to the security page filtered to one token', () => {
    expect(tokenActivityHref('pat_a b')).toBe('/security?activity_token=pat_a%20b#recent-activity');
  });

  test('reads the token id back from the URL', () => {
    const url = new URL(`http://localhost${tokenActivityHref('pat_123')}`);
    expect(parseTokenActivityFilter(url)).toBe('pat_123');
  });

  test('ignores a missing, empty or oversized value', () => {
    expect(parseTokenActivityFilter(new URL('http://localhost/security'))).toBeNull();
    expect(
      parseTokenActivityFilter(new URL('http://localhost/security?activity_token='))
    ).toBeNull();
    const long = 'x'.repeat(129);
    expect(
      parseTokenActivityFilter(new URL(`http://localhost/security?activity_token=${long}`))
    ).toBeNull();
  });
});
