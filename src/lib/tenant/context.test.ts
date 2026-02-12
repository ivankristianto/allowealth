import { describe, expect, it } from 'bun:test';
import { requireTenantContext } from './context';

describe('requireTenantContext', () => {
  it('throws when userId is missing', () => {
    expect(() =>
      requireTenantContext({
        workspaceId: 'ws_1',
        role: 'member',
      })
    ).toThrow('Invalid tenant context: userId is required');
  });

  it('throws when workspaceId is missing', () => {
    expect(() =>
      requireTenantContext({
        userId: 'user_1',
        role: 'member',
      })
    ).toThrow('Invalid tenant context: workspaceId is required');
  });

  it('returns normalized context and defaults role to member', () => {
    expect(
      requireTenantContext({
        userId: 'user_1',
        workspaceId: 'ws_1',
      })
    ).toEqual({
      userId: 'user_1',
      workspaceId: 'ws_1',
      role: 'member',
    });
  });

  it('preserves explicit admin role', () => {
    expect(
      requireTenantContext({
        userId: 'user_1',
        workspaceId: 'ws_1',
        role: 'admin',
      })
    ).toEqual({
      userId: 'user_1',
      workspaceId: 'ws_1',
      role: 'admin',
    });
  });
});
