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
        currency: {
          type: 'string',
          alias: 'c',
          description: 'Optional initial currency (if omitted, onboarding starts at step 1)',
        },
        'week-start': {
          type: 'string',
          alias: 'w',
          description: 'Week start day (monday or sunday)',
          default: 'monday',
        },
        'public-url': {
          type: 'string',
          description: 'Base URL for the signup link (overrides PUBLIC_URL env var)',
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
        const currency = (args.currency as string | undefined)?.trim();
        if (currency) {
          await metaService.set(workspace.id, WORKSPACE_META_KEYS.CURRENCY, currency);
        }

        const weekStart =
          (args['week-start'] as string) || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START];
        await metaService.set(workspace.id, WORKSPACE_META_KEYS.WEEK_START, weekStart);

        const currencyLogValue = currency || 'unset (configured in onboarding step 1)';
        console.log(
          `  Set workspace settings (currency: ${currencyLogValue}, weekStart: ${weekStart})`
        );

        const invitationService = new WorkspaceInvitationService(db);
        const invitation = await invitationService.create({
          workspaceId: workspace.id,
          email: normalizedEmail,
          role: 'admin',
        });

        const baseUrl =
          (args['public-url'] as string | undefined) ||
          getEnv('PUBLIC_URL') ||
          'http://localhost:4321';
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
        const { isValidWorkspaceMetaKey } = await import('@/lib/constants/workspace-meta-keys');

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
            const visibleMetaRecords = metaRecords.filter((meta) =>
              isValidWorkspaceMetaKey(meta.meta_key)
            );

            if (visibleMetaRecords.length === 0) {
              console.log('─'.repeat(80));
              continue;
            }

            console.log(`  Settings:`);
            for (const meta of visibleMetaRecords) {
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
          console.log(`  - All related data (categories, transactions, accounts, etc.)`);
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

    invite: defineCommand({
      meta: { name: 'invite', description: 'Invite a member to an existing workspace' },
      args: {
        target: targetArg,
        'workspace-id': {
          type: 'string',
          alias: 'w',
          description: 'Workspace ID to invite to',
          required: true,
        },
        email: {
          type: 'string',
          alias: 'e',
          description: 'Email of the person to invite',
          required: true,
        },
        role: {
          type: 'string',
          alias: 'r',
          description: 'Role for the invited member (admin or member)',
          default: 'member',
        },
        'public-url': {
          type: 'string',
          description: 'Base URL for the signup link (overrides PUBLIC_URL env var)',
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        const { db } = await import('@/db');
        const { WorkspaceService } = await import('@/services/workspace.service');
        const { WorkspaceInvitationService } =
          await import('@/services/workspace-invitation.service');
        const { getEnv } = await import('@/lib/env');

        const workspaceId = args['workspace-id'] as string;
        const email = (args.email as string).trim().toLowerCase();
        const role = args.role as 'admin' | 'member';

        if (!validateEmail(email)) {
          console.error('Error: Invalid email format');
          process.exit(1);
        }

        if (role !== 'admin' && role !== 'member') {
          console.error('Error: Role must be either "admin" or "member"');
          process.exit(1);
        }

        console.log(`\nLooking up workspace...`);

        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.findById(workspaceId);

        if (!workspace) {
          console.error(`Error: Workspace with ID "${workspaceId}" not found`);
          process.exit(1);
        }

        console.log(`Found workspace: ${workspace.name}`);
        console.log(`Creating invitation for: ${email} (${role})\n`);

        const invitationService = new WorkspaceInvitationService(db);
        const invitation = await invitationService.create({
          workspaceId: workspace.id,
          email,
          role,
        });

        const baseUrl =
          (args['public-url'] as string | undefined) ||
          getEnv('PUBLIC_URL') ||
          'http://localhost:4321';
        const signupLink = `${baseUrl}/signup?token=${invitation.token}`;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Invitation created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\nWorkspace: ${workspace.name}`);
        console.log(`Email:     ${email}`);
        console.log(`Role:      ${role}`);
        console.log(`Expires:   ${invitation.expires_at.toISOString().split('T')[0]}`);
        console.log(`\nInvitation link:\n  ${signupLink}\n`);
      },
    }),

    members: defineCommand({
      meta: { name: 'members', description: 'Manage workspace members' },
      subCommands: {
        list: defineCommand({
          meta: { name: 'list', description: 'List all members in a workspace' },
          args: {
            target: targetArg,
            'workspace-id': {
              type: 'string',
              alias: 'w',
              description: 'Workspace ID',
              required: true,
            },
          },
          async run({ args }) {
            const { resolveTarget } = await import('../lib/target');
            await resolveTarget(args);

            const { db, users } = await import('@/db');
            const { WorkspaceService } = await import('@/services/workspace.service');
            const { and, eq, isNull } = await import('drizzle-orm');

            const workspaceId = args['workspace-id'] as string;

            const workspaceService = new WorkspaceService(db);
            const workspace = await workspaceService.findById(workspaceId);

            if (!workspace) {
              console.error(`Error: Workspace with ID "${workspaceId}" not found`);
              process.exit(1);
            }

            const members = await db
              .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                createdAt: users.created_at,
              })
              .from(users)
              .where(and(eq(users.workspace_id, workspaceId), isNull(users.deleted_at)));

            console.log(`\nWorkspace: ${workspace.name}`);
            console.log(`ID: ${workspace.id}\n`);
            console.log(`Members (${members.length}):\n`);
            console.log('─'.repeat(80));

            for (const member of members) {
              console.log(`\nName:  ${member.name}`);
              console.log(`Email: ${member.email}`);
              console.log(`Role:  ${member.role}`);
              console.log(`ID:    ${member.id}`);
              console.log('─'.repeat(80));
            }

            console.log(`\nTotal: ${members.length} member(s)`);
          },
        }),

        remove: defineCommand({
          meta: { name: 'remove', description: 'Remove a member from workspace' },
          args: {
            target: targetArg,
            'workspace-id': {
              type: 'string',
              alias: 'w',
              description: 'Workspace ID',
              required: true,
            },
            'user-id': {
              type: 'string',
              alias: 'u',
              description: 'User ID to remove',
              required: true,
            },
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
            const { and, eq, isNull } = await import('drizzle-orm');

            const workspaceId = args['workspace-id'] as string;
            const userId = args['user-id'] as string;

            const workspaceService = new WorkspaceService(db);
            const workspace = await workspaceService.findById(workspaceId);

            if (!workspace) {
              console.error(`Error: Workspace with ID "${workspaceId}" not found`);
              process.exit(1);
            }

            const member = await db.query.users.findFirst({
              where: and(
                eq(users.id, userId),
                eq(users.workspace_id, workspaceId),
                isNull(users.deleted_at)
              ),
            });

            if (!member) {
              console.error(`Error: User with ID "${userId}" not found in this workspace`);
              process.exit(1);
            }

            console.log(`\nFound member:`);
            console.log(`  Name:  ${member.name}`);
            console.log(`  Email: ${member.email}`);
            console.log(`  Role:  ${member.role}`);

            if (!args.force) {
              console.log(`\nThis will remove ${member.name} from workspace "${workspace.name}".`);
              console.log('This action cannot be undone.');

              const answer = await prompt('\nType "REMOVE" to confirm: ');
              if (answer !== 'REMOVE') {
                console.log('\nRemoval cancelled.');
                process.exit(0);
              }
            }

            await db
              .update(users)
              .set({ workspace_id: null, updated_at: new Date() })
              .where(and(eq(users.id, userId), eq(users.workspace_id, workspaceId)));

            console.log(`\n${member.name} has been removed from the workspace.`);
          },
        }),
      },
    }),
  },
});
