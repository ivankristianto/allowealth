import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { countRows, createMemoryDb } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { hashOpaqueToken } from '@/lib/crypto/token-hash';
import { bootstrapAuthUser } from './auth.service';
import { WorkspaceInvitationService } from './workspace-invitation.service';

const WORKSPACE_ID = 'ws-cli-created';
const INVITE_TOKEN = 'invite-token-1';
const INVITED_USER = {
  id: 'auth-invited-user',
  email: 'invited@example.test',
  name: 'Invited User',
  image: null,
};

const originalAccept = WorkspaceInvitationService.prototype.accept;

describe('bootstrapAuthUser cleanup for an invited signup', () => {
  let memory: MemoryDb;

  beforeEach(async () => {
    memory = createMemoryDb();
    // A workspace created from the CLI: no members yet, only a pending invite.
    memory.raw.run(`INSERT INTO workspaces (id, name) VALUES (?, 'CLI Workspace')`, [WORKSPACE_ID]);
    memory.raw.run(
      `INSERT INTO workspace_invitations (id, workspace_id, email, token, role, expires_at, created_at)
       VALUES ('inv-1', ?, ?, ?, 'admin', ?, ?)`,
      [
        WORKSPACE_ID,
        INVITED_USER.email,
        await hashOpaqueToken(INVITE_TOKEN),
        Math.floor(Date.now() / 1000) + 86_400,
        Math.floor(Date.now() / 1000),
      ]
    );
    WorkspaceInvitationService.prototype.accept = mock(async () => {
      throw new Error('accept failed');
    }) as typeof originalAccept;
  });

  afterEach(() => {
    WorkspaceInvitationService.prototype.accept = originalAccept;
  });

  it('keeps the invited workspace and its invitation when signup fails', async () => {
    await expect(
      bootstrapAuthUser(
        INVITED_USER,
        { body: { invitationToken: INVITE_TOKEN } },
        'credential',
        memory.db
      )
    ).rejects.toThrow('accept failed');

    expect(countRows(memory.raw, 'users', `id = '${INVITED_USER.id}'`)).toBe(0);
    expect(countRows(memory.raw, 'workspaces', `id = '${WORKSPACE_ID}'`)).toBe(1);
    expect(countRows(memory.raw, 'workspace_invitations', `id = 'inv-1'`)).toBe(1);
  });
});
