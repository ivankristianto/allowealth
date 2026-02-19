export type CliTarget = 'sqlite' | 'd1' | 'd1-local' | 'postgres';

const VALID_TARGETS: CliTarget[] = ['sqlite', 'd1', 'd1-local', 'postgres'];

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

function validateTarget(value: string): CliTarget {
  if (!VALID_TARGETS.includes(value as CliTarget)) {
    console.error(`Error: Invalid target "${value}". Valid targets: ${VALID_TARGETS.join(', ')}`);
    process.exit(1);
  }
  return value as CliTarget;
}

/**
 * Shared arg definition for --target. Add to leaf subcommands that need DB targeting.
 */
export const targetArg = {
  type: 'string' as const,
  alias: 't' as const,
  description: 'Database target: sqlite (default), d1, d1-local, postgres',
  default: 'sqlite',
};

/**
 * Validate target from args, set AW_TARGET env, load .env.production for postgres.
 * Call at the start of each leaf subcommand's run() that uses targetArg.
 */
export async function resolveTarget(args: Record<string, unknown>): Promise<CliTarget> {
  const target = validateTarget(args.target as string);
  process.env.AW_TARGET = target;

  if (target === 'postgres') {
    const { loadEnvFile } = await import('./env-loader');
    loadEnvFile('.env.production');
  }

  return target;
}
