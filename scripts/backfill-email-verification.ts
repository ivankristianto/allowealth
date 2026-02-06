#!/usr/bin/env bun
/**
 * Backfill Script: Email Verification
 *
 * Marks all existing users as email-verified by setting
 * email_verified_at = created_at for every unverified user,
 * and activates all inactive workspaces.
 *
 * This is a one-time migration script to be run after deploying
 * the email verification feature, so that pre-existing users
 * are not locked out of their accounts.
 *
 * Usage: bun run backfill:email-verification
 */

 

import { db, getActiveSchema } from '@/db';
import { createLogger } from '@/lib/logger';
import { eq, isNull } from 'drizzle-orm';

const log = createLogger('backfill:email-verification');

/**
 * Backfill email_verified_at for all unverified users.
 *
 * Sets email_verified_at = created_at so existing users are
 * treated as verified without changing their original timestamps.
 *
 * @returns Number of users updated
 */
async function backfillUsers(): Promise<number> {
  const schema = getActiveSchema();

  const unverifiedUsers = await db.query.users.findMany({
    where: isNull(schema.users.email_verified_at),
  });

  if (unverifiedUsers.length === 0) {
    log.info('No unverified users found. Nothing to backfill.');
    return 0;
  }

  log.info(`Found ${unverifiedUsers.length} unverified user(s). Backfilling...`);

  let updated = 0;

  for (const user of unverifiedUsers) {
    await db
      .update(schema.users)
      .set({ email_verified_at: user.created_at })
      .where(eq(schema.users.id, user.id));

    updated++;
    log.info(`  [${updated}/${unverifiedUsers.length}] Verified user ${user.email}`);
  }

  return updated;
}

/**
 * Activate all inactive workspaces.
 *
 * Sets status = 'active' for every workspace that is currently 'inactive'.
 *
 * @returns Number of workspaces activated
 */
async function activateWorkspaces(): Promise<number> {
  const schema = getActiveSchema();

  const inactiveWorkspaces = await db.query.workspaces.findMany({
    where: eq(schema.workspaces.status, 'inactive'),
  });

  if (inactiveWorkspaces.length === 0) {
    log.info('No inactive workspaces found. Nothing to activate.');
    return 0;
  }

  log.info(`Found ${inactiveWorkspaces.length} inactive workspace(s). Activating...`);

  let activated = 0;

  for (const workspace of inactiveWorkspaces) {
    await db
      .update(schema.workspaces)
      .set({ status: 'active' })
      .where(eq(schema.workspaces.id, workspace.id));

    activated++;
    log.info(
      `  [${activated}/${inactiveWorkspaces.length}] Activated workspace ${workspace.name} (${workspace.id})`
    );
  }

  return activated;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  log.info('Starting email verification backfill...\n');

  try {
    // Step 1: Backfill users
    log.info('Step 1: Backfilling email_verified_at for existing users');
    const usersUpdated = await backfillUsers();

    // Step 2: Activate workspaces
    log.info('\nStep 2: Activating inactive workspaces');
    const workspacesActivated = await activateWorkspaces();

    // Summary
    log.info('\n--- Backfill Summary ---');
    log.info(`  Users verified:       ${usersUpdated}`);
    log.info(`  Workspaces activated: ${workspacesActivated}`);
    log.info('Backfill complete.');
  } catch (error) {
    log.error('Backfill failed:', error);
    process.exit(1);
  }
}

main();
