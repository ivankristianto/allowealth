export type CliTarget = 'sqlite' | 'd1' | 'd1-local';

const VALID_TARGETS: CliTarget[] = ['sqlite', 'd1', 'd1-local'];

export function getTarget(): CliTarget {
  return (process.env.AW_TARGET as CliTarget) || 'sqlite';
}

export function isD1(): boolean {
  const t = getTarget();
  return t === 'd1' || t === 'd1-local';
}

export function isD1Local(): boolean {
  return getTarget() === 'd1-local';
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
  description: 'Database target: sqlite (default), d1, d1-local',
  default: 'sqlite',
};

/**
 * Validate target from args, set AW_TARGET env, load .env.production for d1.
 * If AW_TARGET was already set by the parent command's setup(), defers to it.
 */
export async function resolveTarget(args: Record<string, unknown>): Promise<CliTarget> {
  // Parent setup() may have already set AW_TARGET for non-default targets.
  // Defer to it so `aw --target d1 db migrate` works (parent processed --target).
  // Still ensure D1_ENABLED is set (parent setup handles .env.production and D1_ENABLED,
  // but subprocess invocations may only inherit AW_TARGET without D1_ENABLED).
  if (process.env.AW_TARGET) {
    const inherited = getTarget();
    if ((inherited === 'd1' || inherited === 'd1-local') && !process.env.D1_ENABLED) {
      process.env.D1_ENABLED = 'true';
    }
    return inherited;
  }

  const target = validateTarget(args.target as string);
  process.env.AW_TARGET = target;

  if (target === 'd1') {
    const { loadEnvFile } = await import('./env-loader');
    loadEnvFile('.env.production');
  }

  if (target === 'd1' || target === 'd1-local') {
    process.env.D1_ENABLED = 'true';
  }

  return target;
}

/**
 * Normalize --target/-t with space-separated value to =value syntax in process.argv.
 * Citty treats the first non-flag token as a subcommand name, so `--target d1 db migrate`
 * would interpret "d1" as a subcommand. Converting to `--target=d1` avoids this.
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
