/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import * as readline from 'readline';

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
        // Lazy imports to avoid loading DB at CLI startup
        const { db } = await import('@/db');
        const { WorkspaceService } = await import('@/services/workspace.service');
        const { WorkspaceMetaService } = await import('@/services/workspace-meta.service');
        const { WorkspaceInvitationService } =
          await import('@/services/workspace-invitation.service');
        const { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } =
          await import('@/lib/constants/workspace-meta-keys');
        const { getEnv } = await import('@/lib/env');

        let email = (args.email as string | undefined)?.trim();
        if (!email) {
          email = (await prompt('Admin email: ')).trim();
        }
        if (!validateEmail(email)) {
          console.error('Error: Invalid email format');
          process.exit(1);
        }
        const normalizedEmail = email.toLowerCase();

        console.log('\nCreating workspace...');

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

    'create-d1': defineCommand({
      meta: {
        name: 'create-d1',
        description: 'Create workspace on Cloudflare D1 via wrangler',
      },
      args: {
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
        local: {
          type: 'boolean',
          description: 'Execute against local D1 instead of remote',
        },
      },
      async run({ args }) {
        const { execFileSync } = await import('child_process');
        const { nanoid } = await import('nanoid');

        const D1_DATABASE_NAME = 'allowealth-db';
        const TOKEN_LENGTH = 64;
        const INVITATION_EXPIRY_DAYS = 7;
        const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const isLocal = Boolean(args.local);

        let email = (args.email as string | undefined)?.trim();
        if (!email) {
          email = (await prompt('Admin email: ')).trim();
        }
        if (!validateEmail(email)) {
          console.error('Error: Invalid email format');
          process.exit(1);
        }
        const normalizedEmail = email.toLowerCase();

        console.log(`\nCreate Workspace (D1)`);
        console.log(`Target: ${isLocal ? 'local' : 'remote'} D1\n`);
        console.log('Creating workspace...');

        const sqlEscape = (v: string) => v.replace(/'/g, "''");
        const d1Execute = (sql: string) => {
          execFileSync(
            'wrangler',
            ['d1', 'execute', D1_DATABASE_NAME, isLocal ? '--local' : '--remote', '--command', sql],
            { stdio: 'inherit' }
          );
        };

        const workspaceId = nanoid();
        const invitationId = nanoid();
        const token = nanoid(TOKEN_LENGTH);
        const now = Date.now();
        const expiresAt = now + INVITATION_EXPIRY_MS;
        const name = args.name as string;
        const currency = args.currency as string;
        const weekStart = args['week-start'] as string;
        const compactNumbers = args['compact-numbers'] as string;

        d1Execute(
          `INSERT INTO workspaces (id, name, status, created_at, updated_at) VALUES ('${sqlEscape(workspaceId)}', '${sqlEscape(name)}', 'active', ${now}, ${now});`
        );
        console.log(`  Created workspace: ${name} (${workspaceId})`);

        const metaRows = [
          { key: 'currency', value: currency },
          { key: 'week_start', value: weekStart },
          { key: 'compact_numbers', value: compactNumbers },
        ];
        const metaValues = metaRows
          .map(
            (m) =>
              `('${nanoid()}', '${workspaceId}', '${m.key}', '${sqlEscape(m.value)}', ${now}, ${now})`
          )
          .join(', ');
        d1Execute(
          `INSERT INTO workspace_meta (id, workspace_id, meta_key, meta_value, created_at, updated_at) VALUES ${metaValues};`
        );
        console.log(`  Set workspace settings (currency: ${currency}, weekStart: ${weekStart})`);

        d1Execute(
          `INSERT INTO workspace_invitations (id, workspace_id, email, token, role, expires_at, created_at) VALUES ('${invitationId}', '${workspaceId}', '${sqlEscape(normalizedEmail)}', '${token}', 'admin', ${expiresAt}, ${now});`
        );
        console.log(`  Created admin invitation for: ${normalizedEmail}`);

        const baseUrl = isLocal ? 'http://localhost:4321' : 'https://allowealth.io';
        const signupLink = `${baseUrl}/signup?token=${token}`;

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Workspace created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\nInvitation link:\n  ${signupLink}\n`);
      },
    }),

    list: defineCommand({
      meta: { name: 'list', description: 'List all workspaces with user counts' },
      async run() {
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
        id: { type: 'string', alias: 'i', description: 'Workspace ID to delete', required: true },
        force: {
          type: 'boolean',
          alias: 'f',
          description: 'Skip confirmation prompt',
        },
      },
      async run({ args }) {
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
