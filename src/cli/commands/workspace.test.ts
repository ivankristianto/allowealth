import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import workspaceCommand from './workspace';

function readWorkspaceCommandSource(): string {
  return readFileSync(resolve(process.cwd(), 'src/cli/commands/workspace.ts'), 'utf8');
}

describe('workspace command', () => {
  it('exposes invite and members subcommands', () => {
    const command = workspaceCommand as unknown as {
      subCommands: Record<string, unknown>;
    };

    expect(command.subCommands.invite).toBeDefined();
    expect(command.subCommands.members).toBeDefined();
  });

  it('exposes members list and remove subcommands', () => {
    const command = workspaceCommand as unknown as {
      subCommands: {
        members: {
          subCommands: Record<string, unknown>;
        };
      };
    };

    expect(command.subCommands.members.subCommands.list).toBeDefined();
    expect(command.subCommands.members.subCommands.remove).toBeDefined();
  });

  it('filters soft-deleted users in workspace members list query', () => {
    const source = readWorkspaceCommandSource();

    expect(source).toContain('isNull(users.deleted_at)');
  });

  it('scopes workspace member removal update by workspace id', () => {
    const source = readWorkspaceCommandSource();

    expect(source).toContain(
      '.where(and(eq(users.id, userId), eq(users.workspace_id, workspaceId)))'
    );
  });
});
