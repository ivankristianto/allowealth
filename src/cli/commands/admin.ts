/* eslint-disable no-console -- CLI output is intentional */
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';
import { targetArg } from '../lib/target';

export default defineCommand({
  meta: { name: 'admin', description: 'Admin and security commands' },
  subCommands: {
    'create-super-admin': defineCommand({
      meta: { name: 'create-super-admin', description: 'Promote a user to super admin' },
      args: {
        target: targetArg,
        email: {
          type: 'string',
          alias: 'e',
          description: 'Email of the user to promote',
          required: true,
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        const { db, users } = await import('@/db');
        const { eq, and, isNull } = await import('drizzle-orm');

        const email = (args.email as string).toLowerCase().trim();
        console.log(`\nLooking up user: ${email}...`);

        const user = await db.query.users.findFirst({
          where: and(eq(users.email, email), isNull(users.deleted_at)),
        });

        if (!user) {
          console.error(`Error: User with email "${email}" not found or is soft-deleted.`);
          process.exit(1);
        }

        if (user.role === 'super_admin') {
          console.log(`User "${user.name}" is already a super admin.`);
          return;
        }

        console.log(`Found user: ${user.name} (${user.email})`);
        console.log(`Current role: ${user.role}`);
        console.log(`Current workspace: ${user.workspace_id || 'none'}\n`);

        await (db as any)
          .update(users)
          .set({ role: 'super_admin', workspace_id: null, updated_at: new Date() })
          .where(eq(users.id, user.id));

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`User "${user.name}" promoted to super admin`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('The user can now access /admin routes.');
        console.log('Their workspace association has been removed.');
      },
    }),

    'create-api-key': defineCommand({
      meta: { name: 'create-api-key', description: 'Generate API key for a workspace' },
      args: {
        target: targetArg,
        'workspace-id': {
          type: 'string',
          alias: 'w',
          description: 'Workspace ID',
          required: true,
        },
        'user-id': { type: 'string', alias: 'u', description: 'User ID', required: true },
        name: { type: 'string', alias: 'n', description: 'Key name', required: true },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        console.error(
          'Error: create-api-key has been removed. Use Security -> Connected Apps in the web app to authorize an MCP client.'
        );
        process.exit(1);
      },
    }),

    'generate-email-key': defineCommand({
      meta: {
        name: 'generate-email-key',
        description: 'Generate encryption key for email functionality',
      },
      run() {
        exec('bun', ['run', 'scripts/generate-email-key.ts']);
      },
    }),

    'generate-auth-secret': defineCommand({
      meta: {
        name: 'generate-auth-secret',
        description: 'Generate random BETTER_AUTH_SECRET for authentication',
      },
      run() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const secret = btoa(String.fromCharCode(...array));

        console.log('\n🔐 Better Auth Secret Generator\n');
        console.log('Add the following line to your .env file:\n');
        console.log(`BETTER_AUTH_SECRET=${secret}`);
        console.log('\n⚠️  Keep this secret secure! It is used to sign authentication tokens.\n');
      },
    }),
  },
});
