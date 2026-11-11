import { describe, test, expect } from 'bun:test';
import fs from 'node:fs';

describe('WorkspaceInvitationService', () => {
  test('accepts optional invitedByUserId in create invitation schema', () => {
    const content = fs.readFileSync('src/services/workspace-invitation.service.ts', 'utf-8');

    expect(content).toContain(
      "invitedByUserId: optional(requiredId('Invited by user ID is required'))"
    );
  });

  test('uses signup route in invitation links', () => {
    const content = fs.readFileSync('src/services/workspace-invitation.service.ts', 'utf-8');

    expect(content).toContain('/signup?token=');
    expect(content).not.toContain('/invite?token=');
  });
});
