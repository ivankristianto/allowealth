import type { WipeFlags } from '@/db/wipe-guard';

export const wipeArgs = {
  yes: {
    type: 'boolean' as const,
    description: 'Confirm deleting the data in the target database (required)',
    default: false,
  },
  force: {
    type: 'boolean' as const,
    description: 'Also allow it when the database holds non-demo users',
    default: false,
  },
};

export function toWipeFlags(args: Record<string, unknown>): WipeFlags {
  return { yes: args.yes === true, force: args.force === true };
}

/** argv to forward the flags to the seed and empty scripts, which re-run the guard. */
export function wipeFlagArgv(flags: WipeFlags): string[] {
  return [...(flags.yes ? ['--yes'] : []), ...(flags.force ? ['--force'] : [])];
}
