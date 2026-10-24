export type CliTarget = 'sqlite';

const VALID_TARGETS: CliTarget[] = ['sqlite'];

export function getTarget(): CliTarget {
  return (process.env.AW_TARGET as CliTarget) || 'sqlite';
}

export function validateTarget(value: string): CliTarget {
  if (!VALID_TARGETS.includes(value as CliTarget)) {
    console.error(`Error: Invalid target "${value}". Valid targets: ${VALID_TARGETS.join(', ')}`);
    process.exit(1);
  }
  return value as CliTarget;
}

/**
 * Shared arg definition for --target. Used on both parent and leaf commands.
 */
export const targetArg = {
  type: 'string' as const,
  alias: 't' as const,
  description: 'Database target: sqlite (default)',
  default: 'sqlite',
};

/**
 * Validate target from args and set AW_TARGET env.
 * If AW_TARGET was already set by the parent command's setup(), defers to it.
 */
export async function resolveTarget(args: Record<string, unknown>): Promise<CliTarget> {
  // Parent setup() may have already set AW_TARGET for non-default targets.
  if (process.env.AW_TARGET) {
    return getTarget();
  }

  const target = validateTarget(args.target as string);
  process.env.AW_TARGET = target;

  return target;
}

/**
 * Normalize --target/-t with space-separated value to =value syntax in process.argv.
 * Citty treats the first non-flag token as a subcommand name, so `--target sqlite db migrate`
 * would interpret "sqlite" as a subcommand. Converting to `--target=sqlite` avoids this.
 */
export function normalizeTargetArgv(): void {
  const args = process.argv;
  for (let i = 2; i < args.length - 1; i++) {
    if ((args[i] === '--target' || args[i] === '-t') && !args[i + 1].startsWith('-')) {
      // Always use --target=value (long form) because citty handles -t=value incorrectly
      args[i] = `--target=${args[i + 1]}`;
      args.splice(i + 1, 1);
      break;
    }
  }
}
