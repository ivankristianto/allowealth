/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import * as readline from 'readline';
import { targetArg } from '../lib/target';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default defineCommand({
  meta: { name: 'workspace', description: 'Workspace management commands' },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create workspace and send admin invitation email' },
      args: {
        target: targetArg,
        name: { type: 'string', alias: 'n', description: 'Workspace name', required: true },
        email: { type: 'string', alias: 'e', description: 'Admin invitation email' },
        currency: { type: 'string', alias: 'c', description: 'Default currency', default: 'IDR' },
        'week-start': {
          type: 'string',
          alias: 'w',
          description: 'Week start day (monday or sunday)',
          default: 'monday',
        },
        'compact-numbers': {
          type: 'string',
          description: 'Compact number formatting (true or false)',
          default: 'true',
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        const target = await resolveTarget(args);

        let email = (args.email as string | undefined)?.trim();
        if (!email) {
          email = (await prompt('Admin email: ')).trim();
        }
        if (!validateEmail(email)) {
          console.error('Error: Invalid email format');
          process.exit(1);
        }
        const normalizedEmail = email.toLowerCase();

        const { db } = await import('@/db');
        const { WorkspaceService } = await import('@/services/workspace.service');
        const { WorkspaceMetaService } = await import('@/services/workspace-meta.service');
        const { WorkspaceInvitationService } =
          await import('@/services/workspace-invitation.service');
        const { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } =
          await import('@/lib/constants/workspace-meta-keys');
        const { getEnv } = await import('@/lib/env');

        console.log(`\nCreating workspace (${target})...`);

        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.create({ name: args.name as string });
        console.log(`  Created workspace: ${workspace.name} (${workspace.id})`);

        const metaService = new WorkspaceMetaService(db);
        const currency =
          (args.currency as string) || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.CURRENCY];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.CURRENCY, currency);

        const weekStart =
          (args['week-start'] as string) || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.WEEK_START, weekStart);

        const compactNumbers =
          (args['compact-numbers'] as string) ||
          WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.COMPACT_NUMBERS];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.COMPACT_NUMBERS, compactNumbers);

        console.log(`  Set workspace settings (currency: ${currency}, weekStart: ${weekStart})`);

        const invitationService = new WorkspaceInvitationService(db);
        const invitation = await invitationService.create({
          workspaceId: workspace.id,
          email: normalizedEmail,
          role: 'admin',
        });

        const baseUrl = getEnv('PUBLIC_URL') || 'http://localhost:4321';
        const signupLink = `${baseUrl}/signup?token=${invitation.token}`;

        console.log(`  Created admin invitation for: ${normalizedEmail}`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Workspace created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\nInvitation link:\n  ${signupLink}\n`);
      },
    }),

    list: defineCommand({
      meta: { name: 'list', description: 'List all workspaces with user counts' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        const { db, workspaces, workspaceMeta, users } = await import('@/db');
        const { eq, sql } = await import('drizzle-orm');

        console.log('Fetching workspaces...\n');

        const allWorkspaces = await db.select().from(workspaces).orderBy(workspaces.created_at);

        if (allWorkspaces.length === 0) {
          console.log('No workspaces found.');
          return;
        }

        console.log(`Found ${allWorkspaces.length} workspace(s):\n`);
        console.log('─'.repeat(80));

        for (const workspace of allWorkspaces) {
          const memberResult = await (db as any)
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.workspace_id, workspace.id));

          const metaRecords = await db
            .select()
            .from(workspaceMeta)
            .where(eq(workspaceMeta.workspace_id, workspace.id));

          console.log(`\nWorkspace: ${workspace.name}`);
          console.log(`  ID:         ${workspace.id}`);
          console.log(`  Created:    ${workspace.created_at.toISOString().split('T')[0]}`);
          console.log(`  Members:    ${memberResult[0]?.count ?? 0}`);

          if (metaRecords.length > 0) {
            console.log(`  Settings:`);
            for (const meta of metaRecords) {
              console.log(`    ${meta.meta_key}: ${meta.meta_value}`);
            }
          }
          console.log('─'.repeat(80));
        }

        console.log(`\nTotal: ${allWorkspaces.length} workspace(s)`);
      },
    }),

    delete: defineCommand({
      meta: { name: 'delete', description: 'Delete a workspace and all its data' },
      args: {
        target: targetArg,
        id: { type: 'string', alias: 'i', description: 'Workspace ID to delete', required: true },
        force: {
          type: 'boolean',
          alias: 'f',
          description: 'Skip confirmation prompt',
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        const { db, users } = await import('@/db');
        const { WorkspaceService } = await import('@/services/workspace.service');
        const { eq, sql } = await import('drizzle-orm');

        const workspaceId = args.id as string;
        console.log('Looking up workspace...\n');

        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.findById(workspaceId);

        if (!workspace) {
          console.error(`Error: Workspace with ID "${workspaceId}" not found`);
          process.exit(1);
        }

        const memberResult = await (db as any)
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.workspace_id, workspaceId));
        const memberCount = memberResult[0]?.count ?? 0;

        console.log(`Found workspace:`);
        console.log(`  ID:      ${workspace.id}`);
        console.log(`  Name:    ${workspace.name}`);
        console.log(`  Members: ${memberCount}`);

        if (!args.force) {
          console.log(`\nThis will permanently delete:`);
          console.log(`  - Workspace: ${workspace.name}`);
          console.log(`  - ${memberCount} member(s)`);
          console.log(`  - All related data (categories, transactions, assets, etc.)`);
          console.log(`\nThis action cannot be undone.`);

          const answer = await prompt('\nType "DELETE" to confirm: ');
          if (answer !== 'DELETE') {
            console.log('\nDeletion cancelled.');
            process.exit(0);
          }
        }

        console.log('\nDeleting workspace...');
        await workspaceService.delete(workspaceId);
        console.log('Workspace deleted successfully!');
      },
    }),
  },
});
