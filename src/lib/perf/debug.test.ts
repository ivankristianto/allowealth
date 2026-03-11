import { describe, expect, test } from 'bun:test';
import { isPerfDebugEnabled } from './debug';

describe('isPerfDebugEnabled', () => {
  test('enables perf debug only in local development', () => {
    expect(isPerfDebugEnabled('true', true)).toBe(true);
    expect(isPerfDebugEnabled('true', false)).toBe(false);
  });

  test('stays disabled when PERF_DEBUG is unset or false', () => {
    expect(isPerfDebugEnabled(undefined, true)).toBe(false);
    expect(isPerfDebugEnabled('false', true)).toBe(false);
  });
});
