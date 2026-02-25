/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import { targetArg } from '../lib/target';

export default defineCommand({
  meta: {
    name: 'recurring',
    description: 'Recurring transactions management',
  },
  subCommands: {
    generate: defineCommand({
      meta: {
        name: 'generate',
        description: 'Generate pending occurrences for all active templates',
      },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args as Record<string, unknown>);

        const [{ db }, { RecurringTemplateService }] = await Promise.all([
          import('@/db'),
          import('@/services/recurring-template.service'),
        ]);

        const service = new RecurringTemplateService(db);
        const workspaces = await db.query.workspaces.findMany({
          columns: { id: true },
        });

        if (workspaces.length === 0) {
          console.log('No workspaces found.');
          return;
        }

        for (const workspace of workspaces) {
          const workspaceId = String(workspace.id);
          console.log(`Generating occurrences for workspace ${workspaceId}...`);
          await service.generateOccurrences(workspaceId);
        }

        console.log('Recurring generation completed.');
      },
    }),
  },
});
