import { defineCommand } from 'citty';

const dirArg = {
  type: 'string' as const,
  description: 'Data directory (default: $AW_BACKFILL_DIR)',
};
const monthArg = { type: 'string' as const, description: 'Month, e.g. Jan, 1, or 2099-01' };
const yearArg = { type: 'string' as const, description: 'Year (default: current)' };
const jsonArg = { type: 'boolean' as const, description: 'Output as JSON' };

type Args = Record<string, unknown>;

/**
 * Every subcommand is the same shape: lazily import its module, run it inside
 * the directive-error handler, and take its exit code.
 */
function runner<T>(
  load: () => Promise<{ [key: string]: unknown }>,
  pick: (module: Record<string, unknown>) => (args: T) => Promise<number | void>
) {
  return async ({ args }: { args: Args }) => {
    const [module, { withDirectiveErrors }] = await Promise.all([
      load(),
      import('../lib/backfill/runtime'),
    ]);
    process.exitCode = await withDirectiveErrors(() => pick(module)(args as T));
  };
}

export default defineCommand({
  meta: { name: 'backfill', description: 'Load monthly CSV pairs into the app' },
  subCommands: {
    scaffold: defineCommand({
      meta: { name: 'scaffold', description: 'Emit a config skeleton from a CSV range' },
      args: {
        dir: dirArg,
        from: monthArg,
        to: monthArg,
        year: yearArg,
        json: jsonArg,
        force: { type: 'boolean', description: 'Overwrite an existing config' },
      },
      run: runner(
        () => import('../lib/backfill/scaffold'),
        (m) => m.runScaffoldCommand as (args: unknown) => Promise<number | void>
      ),
    }),
    setup: defineCommand({
      meta: {
        name: 'setup',
        description: 'Reconcile categories; optionally create the second member',
      },
      args: {
        dir: dirArg,
        json: jsonArg,
        'create-user': {
          type: 'boolean',
          description: 'Create the second member (rate limited)',
        },
        email: { type: 'string', description: 'Email for the second member' },
        name: { type: 'string', description: 'Display name for the second member' },
      },
      run: runner(
        () => import('../lib/backfill/setup'),
        (m) => m.runSetupCommand as (args: unknown) => Promise<number | void>
      ),
    }),
    run: defineCommand({
      meta: { name: 'run', description: 'Load one month or a range' },
      args: {
        dir: dirArg,
        month: monthArg,
        from: monthArg,
        to: monthArg,
        year: yearArg,
        json: jsonArg,
        force: { type: 'boolean', description: 'Re-run a loaded month, or purge diverged data' },
        'dry-run': {
          type: 'boolean',
          description: 'Build and verify the plan; write nothing',
        },
      },
      run: runner(
        () => import('../lib/backfill/load'),
        (m) => m.runLoadCommand as (args: unknown) => Promise<number | void>
      ),
    }),
    verify: defineCommand({
      meta: { name: 'verify', description: 'Audit a loaded month against its CSVs (read-only)' },
      args: {
        dir: dirArg,
        month: monthArg,
        year: yearArg,
        json: jsonArg,
        verbose: { type: 'boolean', description: 'Print every row, not just mismatches' },
      },
      run: runner(
        () => import('../lib/backfill/audit'),
        (m) => m.runAuditCommand as (args: unknown) => Promise<number | void>
      ),
    }),
  },
});
