/**
 * CLI Script: List Workspaces
 *
 * Lists all workspaces in the database with their details.
 *
 * Usage: bun run cli:list-workspaces
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db, workspaces, workspaceMeta, users } from '@/db';
import { eq, sql } from 'drizzle-orm';

interface WorkspaceInfo {
  id: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  settings: Record<string, string>;
}

/**
 * Get all workspaces with their member counts and settings
 */
async function getWorkspaces(): Promise<WorkspaceInfo[]> {
  // Get all workspaces
  const allWorkspaces = await db.select().from(workspaces).orderBy(workspaces.created_at);

  const result: WorkspaceInfo[] = [];

  for (const workspace of allWorkspaces) {
    // Get member count using raw SQL count
    const memberResult = await (db as any)
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.workspace_id, workspace.id));

    // Get workspace settings
    const metaRecords = await db
      .select()
      .from(workspaceMeta)
      .where(eq(workspaceMeta.workspace_id, workspace.id));

    const settings: Record<string, string> = {};
    for (const meta of metaRecords) {
      settings[meta.meta_key] = meta.meta_value;
    }

    result.push({
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.created_at,
      memberCount: memberResult[0]?.count ?? 0,
      settings,
    });
  }

  return result;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: bun run cli:list-workspaces

Lists all workspaces in the database with their details.

Options:
  --help, -h    Show this help message
`);
    process.exit(0);
  }

  console.log('Fetching workspaces...\n');

  try {
    const workspaceList = await getWorkspaces();

    if (workspaceList.length === 0) {
      console.log('No workspaces found.');
      return;
    }

    console.log(`Found ${workspaceList.length} workspace(s):\n`);
    console.log('─'.repeat(80));

    for (const workspace of workspaceList) {
      console.log(`\nWorkspace: ${workspace.name}`);
      console.log(`  ID:         ${workspace.id}`);
      console.log(`  Created:    ${formatDate(workspace.createdAt)}`);
      console.log(`  Members:    ${workspace.memberCount}`);

      if (Object.keys(workspace.settings).length > 0) {
        console.log(`  Settings:`);
        for (const [key, value] of Object.entries(workspace.settings)) {
          console.log(`    ${key}: ${value}`);
        }
      }

      console.log('─'.repeat(80));
    }

    console.log(`\nTotal: ${workspaceList.length} workspace(s)`);
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    process.exit(1);
  }
}

main();
