/**
 * CLI Script: Create Workspace with Admin Invitation
 *
 * Creates a new workspace, applies default workspace settings,
 * and sends an admin invitation link for first-time signup.
 *
 * Usage: bun run cli:create-workspace -- --name "Workspace Name" --email admin@example.com
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db } from '@/db';
import { WorkspaceService } from '@/services/workspace.service';
import { WorkspaceMetaService } from '@/services/workspace-meta.service';
import { WorkspaceInvitationService } from '@/services/workspace-invitation.service';
import { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } from '@/lib/constants/workspace-meta-keys';
import { getEnv } from '@/lib/env';
import * as readline from 'readline';

interface CreateWorkspaceOptions {
  name: string;
  email?: string;
  currency?: string;
  weekStart?: string;
  compactNumbers?: boolean;
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
  const options: Partial<CreateWorkspaceOptions> = {};

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
        options.compactNumbers = args[++i] === 'true';
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
Usage: bun run cli:create-workspace -- [options]

Options:
  --name, -n <name>           Workspace name (required)
  --email, -e <email>         Admin email (will prompt if not provided)
  --currency, -c <currency>   Default currency (default: IDR)
  --week-start, -w <day>      Week start day: monday or sunday (default: monday)
  --compact-numbers           Use compact number formatting: true or false (default: true)
  --help, -h                  Show this help message

Examples:
  # Interactive mode (prompts for admin email)
  bun run cli:create-workspace -- --name "My Family"

  # Non-interactive mode
  bun run cli:create-workspace -- --name "My Family" --email admin@example.com
`);
}

function getBaseUrl(): string {
  return getEnv('PUBLIC_URL') || 'http://localhost:4321';
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('');
  console.log('Create Workspace');
  console.log('==================');
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

  try {
    const workspaceService = new WorkspaceService(db);
    const workspace = await workspaceService.create({ name: options.name });

    console.log(`✓ Created workspace: ${workspace.name} (${workspace.id})`);

    const metaService = new WorkspaceMetaService(db);
    const currency = options.currency || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.CURRENCY];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.CURRENCY, currency);

    const weekStart = options.weekStart || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.WEEK_START, weekStart);

    const compactNumbers =
      options.compactNumbers !== undefined
        ? String(options.compactNumbers)
        : WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.COMPACT_NUMBERS];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.COMPACT_NUMBERS, compactNumbers);

    console.log(`✓ Set workspace settings (currency: ${currency}, weekStart: ${weekStart})`);

    const invitationService = new WorkspaceInvitationService(db);
    const invitation = await invitationService.create({
      workspaceId: workspace.id,
      email: normalizedEmail,
      role: 'admin',
    });

    const signupLink = `${getBaseUrl()}/signup?token=${invitation.token}`;

    console.log(`✓ Created admin invitation for: ${normalizedEmail}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Workspace created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Invitation link:');
    console.log(`  ${signupLink}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check admin inbox for the invitation email');
    console.log('  2. If email is unavailable, share the link above manually');
    console.log('  3. Admin completes signup, verifies email, then logs in');
    console.log('');
  } catch (error) {
    console.error('Failed to create workspace:', error);
    process.exit(1);
  }
}

main();
