import { describe, expect, it } from 'bun:test';

import demoCommand from './demo';

describe('demo command', () => {
  it('exposes the reset subcommand', () => {
    const command = demoCommand as unknown as {
      subCommands: Record<string, unknown>;
    };

    expect(command.subCommands.reset).toBeDefined();
  });

  it('reset command supports target selection and yes confirmation flag', () => {
    const command = demoCommand as unknown as {
      subCommands: {
        reset: {
          args: Record<string, { alias?: string }>;
        };
      };
    };

    expect(command.subCommands.reset.args.target).toBeDefined();
    expect(command.subCommands.reset.args.yes).toBeDefined();
    expect(command.subCommands.reset.args.yes.alias).toBe('y');
  });
});
