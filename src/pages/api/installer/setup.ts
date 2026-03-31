/**
 * Installer Setup API Endpoint
 *
 * POST /api/installer/setup
 *
 * Creates the first workspace and admin account. Bypasses Better Auth hooks
 * to avoid signup-mode restrictions. Only works when no users exist.
 */

import type { APIRoute } from 'astro';
import * as v from 'valibot';
import { hashPassword as hashBetterAuthPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getActiveSchema, getDb, runTransaction, type Database } from '@/db';
import { hashPassword } from '@/lib/auth/password';
import { AccountCategoryService } from '@/services/account-category.service';
import { getEnv } from '@/lib/env';
import { hasUsers } from '@/lib/installer/detection';
import { logError } from '@/lib/utils';

async function cleanupFailedInstallerSetup(userId: string, workspaceId: string): Promise<void> {
  const schema = getActiveSchema();

  const database = getDb();

  await database.delete(schema.account).where(eq(schema.account.userId, userId));
  await database.delete(schema.user).where(eq(schema.user.id, userId));
  await database.delete(schema.users).where(eq(schema.users.id, userId));
  await database.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
}

class SetupAlreadyCompleteError extends Error {
  constructor() {
    super('Setup already complete');
    this.name = 'SetupAlreadyCompleteError';
  }
}

export const installerSetupSchema = v.object({
  workspaceName: v.pipe(
    v.string(),
    v.transform((s) => s.trim()),
    v.minLength(1, 'Workspace name is required'),
    v.maxLength(255, 'Workspace name must be less than 255 characters')
  ),
  name: v.pipe(
    v.string(),
    v.transform((s) => s.trim()),
    v.minLength(1, 'Name is required')
  ),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  password: v.pipe(v.string(), v.minLength(12, 'Password must be at least 12 characters')),
  installerSecret: v.optional(v.string()),
});

export const POST: APIRoute = async ({ request }) => {
  const database = getDb();

  // Guard: already installed
  if (hasUsers(database)) {
    return new Response(JSON.stringify({ error: 'Setup already complete' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = v.safeParse(installerSetupSchema, body);
  if (!result.success) {
    const firstIssue = result.issues[0];
    return new Response(JSON.stringify({ error: firstIssue.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { workspaceName, name, email, password, installerSecret } = result.output;
  const configuredInstallerSecret = getEnv('INSTALLER_SECRET');

  // Optional bootstrap secret for unattended fresh deployments.
  if (configuredInstallerSecret && installerSecret !== configuredInstallerSecret) {
    return new Response(JSON.stringify({ error: 'Invalid installer secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const schema = getActiveSchema();
  const userId = nanoid();
  const workspaceId = nanoid();
  const accountId = nanoid();

  try {
    const [legacyPasswordHash, authPasswordHash] = await Promise.all([
      hashPassword(password),
      hashBetterAuthPassword(password),
    ]);
    const now = new Date();

    await runTransaction(database, async (tx) => {
      if (hasUsers(tx as unknown as Database)) {
        throw new SetupAlreadyCompleteError();
      }

      const categoryService = new AccountCategoryService(tx);

      // 1. Better Auth user table
      await tx.insert(schema.user).values({
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // 2. Better Auth account table (credential provider)
      await tx.insert(schema.account).values({
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: authPasswordHash,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Workspace
      await tx.insert(schema.workspaces).values({
        id: workspaceId,
        name: workspaceName.trim(),
        status: 'active',
        created_at: now,
        updated_at: now,
      });

      // 4. Domain user
      await tx.insert(schema.users).values({
        id: userId,
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        password_hash: legacyPasswordHash,
        name: name.trim(),
        role: 'admin',
        email_verified_at: now,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      });

      // 5. Seed default categories inside the same transaction
      await categoryService.seedDefaultCategories(workspaceId, userId);
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof SetupAlreadyCompleteError) {
      return new Response(JSON.stringify({ error: 'Setup already complete' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      await cleanupFailedInstallerSetup(userId, workspaceId);
    } catch (cleanupError) {
      logError('Installer cleanup failed', cleanupError);
    }
    logError('Installer setup failed', error);
    return new Response(JSON.stringify({ error: 'Setup failed. Check server logs for details.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
