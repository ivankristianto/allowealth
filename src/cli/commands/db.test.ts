import { describe, expect, it } from 'bun:test';
import dbCommand from './db';

describe('db command', () => {
  it('exposes backup and restore subcommands', () => {
    const command = dbCommand as unknown as {
      subCommands: Record<string, unknown>;
    };

    expect(command.subCommands.backup).toBeDefined();
    expect(command.subCommands.restore).toBeDefined();
  });

  it('exposes the seed-oauth-clients subcommand', () => {
    const command = dbCommand as unknown as {
      subCommands: Record<string, unknown>;
    };

    expect(command.subCommands['seed-oauth-clients']).toBeDefined();
  });

  it('backup command supports target selection', () => {
    const command = dbCommand as unknown as {
      subCommands: {
        backup: {
          args: Record<string, { alias?: string }>;
        };
      };
    };

    expect(command.subCommands.backup.args.target).toBeDefined();
    expect(command.subCommands.backup.args.target.alias).toBe('t');
  });

  it('restore command includes safety and source flags', () => {
    const command = dbCommand as unknown as {
      subCommands: {
        restore: {
          args: Record<string, unknown>;
        };
      };
    };

    expect(command.subCommands.restore.args.target).toBeDefined();
    expect(command.subCommands.restore.args.source).toBeDefined();
    expect(command.subCommands.restore.args['dry-run']).toBeDefined();
    expect(command.subCommands.restore.args['no-backup']).toBeDefined();
    expect(command.subCommands.restore.args.force).toBeDefined();
  });

  it('exposes prune subcommand', () => {
    const command = dbCommand as unknown as {
      subCommands: Record<string, unknown>;
    };

    expect(command.subCommands.prune).toBeDefined();
  });

  it('prune command exposes audit-logs subcommand', () => {
    const command = dbCommand as unknown as {
      subCommands: {
        prune: {
          subCommands: Record<string, unknown>;
        };
      };
    };

    expect(command.subCommands.prune.subCommands['audit-logs']).toBeDefined();
  });

  it('prune audit-logs command includes required flags', () => {
    const command = dbCommand as unknown as {
      subCommands: {
        prune: {
          subCommands: {
            'audit-logs': {
              args: Record<string, unknown>;
            };
          };
        };
      };
    };

    expect(command.subCommands.prune.subCommands['audit-logs'].args.target).toBeDefined();
    expect(command.subCommands.prune.subCommands['audit-logs'].args.days).toBeDefined();
    expect(command.subCommands.prune.subCommands['audit-logs'].args['dry-run']).toBeDefined();
    expect(command.subCommands.prune.subCommands['audit-logs'].args.force).toBeDefined();
  });
});
