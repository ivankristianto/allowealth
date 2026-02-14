/**
 * CLI Script: Create/Promote Super Admin
 *
 * Promotes an existing user to super_admin role.
 * Removes workspace association (sets workspace_id to null).
 *
 * Usage: bun run cli:create-super-admin -- --email admin@example.com
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db, users } from '@/db';
import { eq, and, isNull } from 'drizzle-orm';

function parseArgs(): { email: string } {
  const args = process.argv.slice(2);
  let email = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' || args[i] === '-e') {
      email = args[++i] || '';
    }
    if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!email) {
    console.error('Error: --email is required');
    printHelp();
    process.exit(1);
  }

  return { email: email.toLowerCase().trim() };
}

function printHelp(): void {
  console.log(`
Usage: bun run cli:create-super-admin -- --email <email>

Promotes an existing user to super_admin role.

Options:
  --email, -e <email>   Email of the user to promote (required)
  --help, -h            Show this help message
`);
}

async function main(): Promise<void> {
  const { email } = parseArgs();

  console.log(`\nLooking up user: ${email}...`);

  // Find user by email
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), isNull(users.deleted_at)),
  });

  if (!user) {
    console.error(`Error: User with email "${email}" not found or is soft-deleted.`);
    process.exit(1);
  }

  if (user.role === 'super_admin') {
    console.log(`User "${user.name}" is already a super admin.`);
    process.exit(0);
  }

  console.log(`Found user: ${user.name} (${user.email})`);
  console.log(`Current role: ${user.role}`);
  console.log(`Current workspace: ${user.workspace_id || 'none'}`);
  console.log('');

  // Promote to super admin
  await (db as any)
    .update(users)
    .set({
      role: 'super_admin',
      workspace_id: null,
      updated_at: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`User "${user.name}" promoted to super admin`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('The user can now access /admin routes.');
  console.log('Their workspace association has been removed.');
}

main();
