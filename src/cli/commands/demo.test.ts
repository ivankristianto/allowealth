import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';

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

  describe('reset hasher guard', () => {
    type ResetSubCommand = {
      run: (ctx: { args: { target: string; yes: boolean } }) => Promise<void>;
    };
    const reset = (
      demoCommand as unknown as {
        subCommands: { reset: ResetSubCommand };
      }
    ).subCommands.reset;

    const originalAwTarget = process.env.AW_TARGET;
    const originalD1Enabled = process.env.D1_ENABLED;
    const originalHasher = process.env.PASSWORD_HASHER;

    beforeEach(() => {
      delete process.env.AW_TARGET;
      delete process.env.D1_ENABLED;
      delete process.env.PASSWORD_HASHER;
    });

    afterEach(() => {
      if (originalAwTarget === undefined) delete process.env.AW_TARGET;
      else process.env.AW_TARGET = originalAwTarget;
      if (originalD1Enabled === undefined) delete process.env.D1_ENABLED;
      else process.env.D1_ENABLED = originalD1Enabled;
      if (originalHasher === undefined) delete process.env.PASSWORD_HASHER;
      else process.env.PASSWORD_HASHER = originalHasher;
    });

    it('refuses to run on D1 without PASSWORD_HASHER=pbkdf2', async () => {
      process.env.AW_TARGET = 'd1';

      const errorSpy = spyOn(console, 'error').mockImplementation(() => undefined);
      const exitSpy = spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`__exit__:${code}`);
      }) as never);

      try {
        await expect(reset.run({ args: { target: 'd1', yes: true } })).rejects.toThrow(
          '__exit__:1'
        );
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(errorSpy).toHaveBeenCalledWith(
          '❌ Cannot reset demo data on a D1 target with the default hasher.'
        );
      } finally {
        errorSpy.mockReset();
        exitSpy.mockReset();
      }
    });
  });
});
