import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import backfillCommand from './backfill';

interface SubCommands {
  subCommands: Record<string, { args: Record<string, unknown> }>;
}

const command = backfillCommand as unknown as SubCommands;

describe('backfill command', () => {
  it('exposes the four subcommands', () => {
    for (const name of ['scaffold', 'setup', 'run', 'verify']) {
      expect(command.subCommands[name]).toBeDefined();
    }
  });

  it('accepts month, year, dir, force and dry-run on run', () => {
    for (const a of ['month', 'year', 'dir', 'force', 'dry-run']) {
      expect(command.subCommands.run?.args[a]).toBeDefined();
    }
  });

  it('accepts a month range on run', () => {
    for (const a of ['from', 'to']) {
      expect(command.subCommands.run?.args[a]).toBeDefined();
    }
  });

  it('does not expose a password flag anywhere', () => {
    const src = readFileSync('src/cli/commands/backfill.ts', 'utf8');
    expect(src).not.toMatch(/password/i);
  });
});
