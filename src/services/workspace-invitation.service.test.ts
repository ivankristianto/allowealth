import { describe, test, expect } from 'bun:test';

describe('WorkspaceInvitationService', () => {
  test('accepts optional invitedByUserId in create invitation schema', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/services/workspace-invitation.service.ts', 'utf-8');

    expect(content).toContain('invitedByUserId: z.string()');
    expect(content).toContain('.optional()');
  });

  test('uses signup route in invitation links', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/services/workspace-invitation.service.ts', 'utf-8');

    expect(content).toContain('/signup?token=');
    expect(content).not.toContain('/invite?token=');
  });
});
