/**
 * CLI Script: Delete Workspace
 *
 * Deletes a workspace and all associated data.
 * Requires confirmation unless --force flag is used.
 *
 * Usage: bun run cli:delete-workspace -- --id <workspace-id> [--force]
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db, users } from '@/db';
import { WorkspaceService } from '@/services/workspace.service';
import { eq, sql } from 'drizzle-orm';
import * as readline from 'readline';

interface DeleteWorkspaceOptions {
  id: string;
  force: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): DeleteWorkspaceOptions {
  const args = process.argv.slice(2);
  const options: Partial<DeleteWorkspaceOptions> = {
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--id':
      case '-i':
        options.id = args[++i];
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!options.id) {
    console.error('Error: --id is required');
    printHelp();
    process.exit(1);
  }

  return options as DeleteWorkspaceOptions;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Usage: bun run cli:delete-workspace -- [options]

Options:
  --id, -i <id>    Workspace ID to delete (required)
  --force, -f      Skip confirmation prompt
  --help, -h       Show this help message

Examples:
  bun run cli:delete-workspace -- --id abc123
  bun run cli:delete-workspace -- --id abc123 --force
`);
}

/**
 * Prompt user for confirmation
 */
async function confirmDeletion(workspaceName: string, memberCount: number): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(`\nThis will permanently delete:`);
    console.log(`  - Workspace: ${workspaceName}`);
    console.log(`  - ${memberCount} member(s)`);
    console.log(`  - All related data (categories, transactions, assets, etc.)`);
    console.log(`\nThis action cannot be undone.`);

    rl.question('\nType "DELETE" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE');
    });
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('Looking up workspace...\n');

  try {
    const workspaceService = new WorkspaceService(db);

    // Find workspace
    const workspace = await workspaceService.findById(options.id);

    if (!workspace) {
      console.error(`Error: Workspace with ID "${options.id}" not found`);
      process.exit(1);
    }

    // Get member count using raw SQL count
    const memberResult = await (db as any)
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.workspace_id, options.id));

    const memberCount = memberResult[0]?.count ?? 0;

    console.log(`Found workspace:`);
    console.log(`  ID:      ${workspace.id}`);
    console.log(`  Name:    ${workspace.name}`);
    console.log(`  Members: ${memberCount}`);

    // Confirm deletion (unless --force)
    if (!options.force) {
      const confirmed = await confirmDeletion(workspace.name, memberCount);
      if (!confirmed) {
        console.log('\nDeletion cancelled.');
        process.exit(0);
      }
    }

    console.log('\nDeleting workspace...');

    // Delete workspace
    await workspaceService.delete(options.id);

    console.log('Workspace deleted successfully!');
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    process.exit(1);
  }
}

main();
