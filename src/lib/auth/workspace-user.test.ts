import { describe, expect, test } from 'bun:test';
import type { AuthUser } from '@/lib/auth/types';
import { hasWorkspace } from './workspace-user';

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 'u1',
    email: 'u1@example.com',
    name: 'User One',
    role: 'member',
    workspaceId: 'ws-1',
    avatarUrl: null,
    deletedAt: null,
    ...overrides,
  };
}

describe('hasWorkspace', () => {
  test('accepts a workspace member', () => {
    expect(hasWorkspace(user({}))).toBe(true);
  });

  test('rejects a super admin without a workspace', () => {
    expect(hasWorkspace(user({ role: 'super_admin', workspaceId: null }))).toBe(false);
  });

  test('rejects a missing user and an empty workspace id', () => {
    expect(hasWorkspace(null)).toBe(false);
    expect(hasWorkspace(undefined)).toBe(false);
    expect(hasWorkspace(user({ workspaceId: '' }))).toBe(false);
  });
});
