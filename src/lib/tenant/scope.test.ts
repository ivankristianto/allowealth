import { describe, expect, it } from 'bun:test';
import { assertWorkspace } from './scope';
import { isAllowlistedGlobalQuery } from './allowlist';

describe('assertWorkspace', () => {
  it('does not throw for matching workspace IDs', () => {
    expect(() => assertWorkspace('ws_1', 'ws_1')).not.toThrow();
  });

  it('throws for mismatched workspace IDs', () => {
    expect(() => assertWorkspace('ws_a', 'ws_b')).toThrow(
      'Workspace scope violation: expected ws_a, got ws_b'
    );
  });
});

describe('isAllowlistedGlobalQuery', () => {
  it('returns true for known allowlist IDs', () => {
    expect(isAllowlistedGlobalQuery('AUTH_TOKEN_LOOKUP')).toBe(true);
  });

  it('returns false for unknown IDs', () => {
    expect(isAllowlistedGlobalQuery('UNLISTED_QUERY')).toBe(false);
  });
});
