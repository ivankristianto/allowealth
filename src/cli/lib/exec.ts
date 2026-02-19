import { execFileSync } from 'child_process';

/**
 * Run a command with inherited stdio.
 * Uses execFileSync with argv array to avoid shell injection.
 */
export function exec(command: string, args: string[], env?: Record<string, string>): void {
  try {
    execFileSync(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
  } catch (e: unknown) {
    const code = (e as { status?: number }).status ?? 1;
    process.exit(code);
  }
}
