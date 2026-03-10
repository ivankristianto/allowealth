import { describe, expect, it } from 'bun:test';
import type { IDatabase } from '@/db';
import {
  WorkspaceInvitationService,
  type CreateInvitationInput,
} from './workspace-invitation.service';

const fakeDb = {} as unknown as IDatabase;

describe('WorkspaceInvitationService validation', () => {
  const service = new WorkspaceInvitationService(fakeDb);

  it('rejects invalid invitation inputs', async () => {
    const invalidInput = {
      workspaceId: '',
      email: 'bad',
      invitedByUserId: 'user-1',
      role: 'owner',
    } as unknown as CreateInvitationInput;

    await expect(service.create(invalidInput)).rejects.toThrow();
  });
});
