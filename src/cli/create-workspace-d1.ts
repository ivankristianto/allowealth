/**
 * CLI Script: Create Workspace on Cloudflare D1
 *
 * Creates a new workspace, applies default workspace settings,
 * and generates an admin invitation link — all via `wrangler d1 execute`.
 *
 * Usage: bun run cli:create-workspace:d1 -- --name "Workspace Name" --email admin@example.com
 *        bun run cli:create-workspace:d1 -- --name "Workspace Name" --email admin@example.com --local
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { execFileSync } from 'child_process';
import { nanoid } from 'nanoid';
import * as readline from 'readline';

const D1_DATABASE_NAME = 'allowealth-db';
const TOKEN_LENGTH = 64;
const INVITATION_EXPIRY_DAYS = 7;
const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

interface CreateWorkspaceOptions {
  name: string;
  email?: string;
  currency: string;
  weekStart: string;
  compactNumbers: string;
  local: boolean;
}

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function parseArgs(): CreateWorkspaceOptions {
  const args = process.argv.slice(2);
  const options: Partial<CreateWorkspaceOptions> = {
    currency: 'IDR',
    weekStart: 'monday',
    compactNumbers: 'true',
    local: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--email':
      case '-e':
        options.email = args[++i];
        break;
      case '--currency':
      case '-c':
        options.currency = args[++i];
        break;
      case '--week-start':
      case '-w':
        options.weekStart = args[++i];
        break;
      case '--compact-numbers':
        options.compactNumbers = args[++i];
        break;
      case '--local':
        options.local = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!options.name) {
    console.error('Error: --name is required');
    printHelp();
    process.exit(1);
  }

  return options as CreateWorkspaceOptions;
}

function printHelp(): void {
  console.log(`
Usage: bun run cli:create-workspace:d1 -- [options]

Options:
  --name, -n <name>           Workspace name (required)
  --email, -e <email>         Admin email (will prompt if not provided)
  --currency, -c <currency>   Default currency (default: IDR)
  --week-start, -w <day>      Week start day: monday or sunday (default: monday)
  --compact-numbers <true|false>  Compact number formatting (default: true)
  --local                     Execute against local D1 (default: remote)
  --help, -h                  Show this help message

Examples:
  # Remote D1 (production)
  bun run cli:create-workspace:d1 -- --name "My Family" --email admin@example.com

  # Local D1 (development)
  bun run cli:create-workspace:d1 -- --name "My Family" --email admin@example.com --local
`);
}

/**
 * Execute a SQL command against D1 via wrangler
 */
function d1Execute(sql: string, local: boolean): void {
  const args = [
    'd1',
    'execute',
    D1_DATABASE_NAME,
    local ? '--local' : '--remote',
    '--command',
    sql,
  ];
  execFileSync('wrangler', args, { stdio: 'inherit' });
}

/**
 * Escape single quotes in SQL string values
 */
function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('');
  console.log('Create Workspace (D1)');
  console.log('=====================');
  console.log(`Target: ${options.local ? 'local' : 'remote'} D1`);
  console.log('');

  let email = options.email?.trim();
  if (!email) {
    email = (await prompt('Admin email: ')).trim();
  }

  if (!validateEmail(email)) {
    console.error('Error: Invalid email format');
    process.exit(1);
  }
  const normalizedEmail = email.toLowerCase();

  console.log('');
  console.log('Creating workspace...');

  const workspaceId = nanoid();
  const invitationId = nanoid();
  const token = nanoid(TOKEN_LENGTH);
  const now = Date.now();
  const expiresAt = now + INVITATION_EXPIRY_MS;

  // 1. Create workspace
  d1Execute(
    `INSERT INTO workspaces (id, name, status, created_at, updated_at) VALUES ('${sqlEscape(workspaceId)}', '${sqlEscape(options.name)}', 'active', ${now}, ${now});`,
    options.local
  );
  console.log(`  Created workspace: ${options.name} (${workspaceId})`);

  // 2. Set workspace meta
  const metaRows = [
    { key: 'currency', value: options.currency },
    { key: 'week_start', value: options.weekStart },
    { key: 'compact_numbers', value: options.compactNumbers },
  ];
  const metaValues = metaRows
    .map(
      (m) =>
        `('${nanoid()}', '${workspaceId}', '${m.key}', '${sqlEscape(m.value)}', ${now}, ${now})`
    )
    .join(', ');
  d1Execute(
    `INSERT INTO workspace_meta (id, workspace_id, meta_key, meta_value, created_at, updated_at) VALUES ${metaValues};`,
    options.local
  );
  console.log(
    `  Set workspace settings (currency: ${options.currency}, weekStart: ${options.weekStart})`
  );

  // 3. Create admin invitation
  d1Execute(
    `INSERT INTO workspace_invitations (id, workspace_id, email, token, role, expires_at, created_at) VALUES ('${invitationId}', '${workspaceId}', '${sqlEscape(normalizedEmail)}', '${token}', 'admin', ${expiresAt}, ${now});`,
    options.local
  );
  console.log(`  Created admin invitation for: ${normalizedEmail}`);

  const baseUrl = options.local ? 'http://localhost:4321' : 'https://allowealth.io';
  const signupLink = `${baseUrl}/signup?token=${token}`;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Workspace created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Invitation link:');
  console.log(`  ${signupLink}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Open the invitation link in your browser');
  console.log('  2. Complete signup with the admin email');
  console.log(`  3. Invitation expires in ${INVITATION_EXPIRY_DAYS} days`);
  console.log('');
}

main();
