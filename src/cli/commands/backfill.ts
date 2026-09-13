import { defineCommand } from 'citty';

const dirArg = {
  type: 'string' as const,
  description: 'Data directory (default: $AW_BACKFILL_DIR)',
};
const monthArg = { type: 'string' as const, description: 'Month, e.g. Jan, 1, or 2099-01' };
const yearArg = { type: 'string' as const, description: 'Year (default: current)' };

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
        force: { type: 'boolean', description: 'Overwrite an existing config' },
      },
      async run({ args }) {
        const { runScaffoldCommand } = await import('../lib/backfill/scaffold');
        await runScaffoldCommand(args);
      },
    }),
    setup: defineCommand({
      meta: {
        name: 'setup',
        description: 'Reconcile categories; optionally create the second member',
      },
      args: {
        dir: dirArg,
        'create-user': {
          type: 'boolean',
          description: 'Create the second member (rate limited)',
        },
        email: { type: 'string', description: 'Email for the second member' },
        name: { type: 'string', description: 'Display name for the second member' },
      },
      async run({ args }) {
        const { runSetupCommand } = await import('../lib/backfill/setup');
        await runSetupCommand(args);
      },
    }),
    run: defineCommand({
      meta: { name: 'run', description: 'Load one month or a range' },
      args: {
        dir: dirArg,
        month: monthArg,
        from: monthArg,
        to: monthArg,
        year: yearArg,
        force: { type: 'boolean', description: 'Re-run a loaded month, or purge diverged data' },
        'dry-run': {
          type: 'boolean',
          description: 'Build and verify the plan; write nothing',
        },
      },
      async run({ args }) {
        const { runLoadCommand } = await import('../lib/backfill/load');
        await runLoadCommand(args);
      },
    }),
    verify: defineCommand({
      meta: { name: 'verify', description: 'Audit a loaded month against its CSVs (read-only)' },
      args: {
        dir: dirArg,
        month: monthArg,
        year: yearArg,
        verbose: { type: 'boolean', description: 'Print every row, not just mismatches' },
      },
      async run({ args }) {
        const { runAuditCommand } = await import('../lib/backfill/audit');
        process.exitCode = await runAuditCommand(args);
      },
    }),
  },
});
