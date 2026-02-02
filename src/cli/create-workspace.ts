/**
 * CLI Script: Create Workspace with Admin User
 *
 * Creates a new workspace with an admin user and default categories.
 * This is the primary setup command for production deployments.
 *
 * Usage: bun run cli:create-workspace -- --name "Workspace Name" --email admin@example.com
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db } from '@/db';
import { WorkspaceService } from '@/services/workspace.service';
import { WorkspaceMetaService } from '@/services/workspace-meta.service';
import { AssetCategoryService } from '@/services/asset-category.service';
import { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } from '@/lib/constants/workspace-meta-keys';
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/constants';
import { hashPassword } from '@/lib/auth/password';
import { users } from '@/db/schema';
import { nanoid } from 'nanoid';
import * as readline from 'readline';

interface CreateWorkspaceOptions {
  name: string;
  email?: string;
  password?: string;
  currency?: string;
  weekStart?: string;
  compactNumbers?: boolean;
}

/**
 * Prompt for user input (hidden for passwords)
 */
function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // For password input, we need to handle it specially
      process.stdout.write(question);
      let password = '';

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (char === '\u007F') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          password += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasLetter || !hasNumberOrSpecial) {
    return {
      valid: false,
      message: 'Password must contain letters and numbers/special characters',
    };
  }
  return { valid: true };
}

/**
 * Parse command line arguments
 */
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
      case '--password':
      case '-p':
        options.password = args[++i];
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

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Usage: bun run cli:create-workspace -- [options]

Options:
  --name, -n <name>           Workspace name (required)
  --email, -e <email>         Admin email (will prompt if not provided)
  --password, -p <password>   Admin password (will prompt if not provided)
  --currency, -c <currency>   Default currency (default: IDR)
  --week-start, -w <day>      Week start day: monday or sunday (default: monday)
  --compact-numbers           Use compact number formatting: true or false (default: true)
  --help, -h                  Show this help message

Examples:
  # Interactive mode (prompts for email/password)
  bun run cli:create-workspace -- --name "My Family"

  # Non-interactive mode
  bun run cli:create-workspace -- --name "My Family" --email admin@example.com --password "SecurePass123!"
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('');
  console.log('Create Workspace');
  console.log('==================');
  console.log('');

  // Get admin email
  let email = options.email;
  if (!email) {
    email = await prompt('Admin email: ');
  }
  if (!validateEmail(email)) {
    console.error('Error: Invalid email format');
    process.exit(1);
  }

  // Get admin password
  let password = options.password;
  if (!password) {
    password = await prompt('Admin password: ', true);
    const confirm = await prompt('Confirm password: ', true);
    if (password !== confirm) {
      console.error('Error: Passwords do not match');
      process.exit(1);
    }
  }
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.error(`Error: ${passwordValidation.message}`);
    process.exit(1);
  }

  console.log('');
  console.log('Creating workspace...');

  try {
    // Create workspace
    const workspaceService = new WorkspaceService(db);
    const workspace = await workspaceService.create({ name: options.name });

    console.log(`✓ Created workspace: ${workspace.name} (${workspace.id})`);

    // Set workspace meta values
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

    // Create admin user
    const userId = nanoid();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      workspace_id: workspace.id,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: 'Admin',
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`✓ Created admin user: ${email}`);

    // Create default asset categories
    const assetCategoryService = new AssetCategoryService(db);
    for (const category of DEFAULT_ASSET_CATEGORIES) {
      await assetCategoryService.create({
        workspace_id: workspace.id,
        created_by_user_id: userId,
        name: category.name,
        description: category.description,
        is_liability: category.isLiability,
        is_system: true,
        sort_order: category.sortOrder,
      });
    }

    console.log(`✓ Created ${DEFAULT_ASSET_CATEGORIES.length} default asset categories`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Workspace created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: (the password you entered)`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Open your app URL in a browser');
    console.log('  2. Log in with the credentials above');
    console.log('  3. Invite family members from Settings');
    console.log('');
  } catch (error) {
    console.error('Failed to create workspace:', error);
    process.exit(1);
  }
}

main();
