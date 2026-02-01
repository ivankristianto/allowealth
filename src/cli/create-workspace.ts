/**
 * CLI Script: Create Workspace
 *
 * Creates a new workspace with optional default meta values.
 *
 * Usage: bun run cli:create-workspace -- --name "Workspace Name"
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db } from '@/db';
import { WorkspaceService } from '@/services/workspace.service';
import { WorkspaceMetaService } from '@/services/workspace-meta.service';
import { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } from '@/lib/constants/workspace-meta-keys';

interface CreateWorkspaceOptions {
  name: string;
  currency?: string;
  weekStart?: string;
  compactNumbers?: boolean;
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
  --currency, -c <currency>   Default currency (default: IDR)
  --week-start, -w <day>      Week start day: monday or sunday (default: monday)
  --compact-numbers           Use compact number formatting: true or false (default: true)
  --help, -h                  Show this help message

Examples:
  bun run cli:create-workspace -- --name "My Family"
  bun run cli:create-workspace -- --name "Business" --currency USD --week-start sunday
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('Creating workspace...\n');

  try {
    // Create workspace
    const workspaceService = new WorkspaceService(db);
    const workspace = await workspaceService.create({ name: options.name });

    console.log(`Created workspace:`);
    console.log(`  ID:   ${workspace.id}`);
    console.log(`  Name: ${workspace.name}`);

    // Set workspace meta values
    const metaService = new WorkspaceMetaService(db);

    // Currency
    const currency = options.currency || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.CURRENCY];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.CURRENCY, currency);

    // Week start
    const weekStart = options.weekStart || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.WEEK_START, weekStart);

    // Compact numbers
    const compactNumbers =
      options.compactNumbers !== undefined
        ? String(options.compactNumbers)
        : WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.COMPACT_NUMBERS];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.COMPACT_NUMBERS, compactNumbers);

    console.log(`\nWorkspace settings:`);
    console.log(`  Currency:        ${currency}`);
    console.log(`  Week Start:      ${weekStart}`);
    console.log(`  Compact Numbers: ${compactNumbers}`);

    console.log('\nWorkspace created successfully!');
  } catch (error) {
    console.error('Failed to create workspace:', error);
    process.exit(1);
  }
}

main();
