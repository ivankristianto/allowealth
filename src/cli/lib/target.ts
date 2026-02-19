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

export function validateTarget(value: string): CliTarget {
  if (!VALID_TARGETS.includes(value as CliTarget)) {
    throw new Error(`Invalid target "${value}". Valid targets: ${VALID_TARGETS.join(', ')}`);
  }
  return value as CliTarget;
}
