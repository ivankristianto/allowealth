/**
 * Installer Setup API Endpoint
 *
 * POST /api/installer/setup
 *
 * Creates the first workspace and admin account. Bypasses Better Auth hooks
 * to avoid signup-mode restrictions. Only works when no users exist.
 */

import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import * as v from 'valibot';
import { nanoid } from 'nanoid';
import { getActiveSchema, getDb, runTransaction, type Database } from '@/db';
import { hashPassword } from '@/lib/auth/password';
import { AccountCategoryService } from '@/services/account-category.service';
import { getEnv } from '@/lib/env';
import { CacheTags, invalidateTags } from '@/lib/cache';
import { hasUsers } from '@/lib/installer/detection';
import { logError } from '@/lib/utils';

class SetupAlreadyCompleteError extends Error {
  constructor() {
    super('Setup already complete');
    this.name = 'SetupAlreadyCompleteError';
  }
}

/** Only development and test may skip the secret; an unset NODE_ENV counts as production. */
function isInstallerSecretRequired(): boolean {
  const nodeEnv = getEnv('NODE_ENV');
  return nodeEnv !== 'development' && nodeEnv !== 'test';
}

// Hashing first gives equal-length buffers, so the compare leaks neither content nor length.
function secretsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
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
  email: v.pipe(
    v.string(),
    v.transform((s) => s.trim()),
    v.email('Invalid email address')
  ),
  password: v.pipe(v.string(), v.minLength(12, 'Password must be at least 12 characters')),
  installerSecret: v.optional(
    v.pipe(
      v.string(),
      v.transform((s) => s.trim())
    )
  ),
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

  if (!configuredInstallerSecret && isInstallerSecretRequired()) {
    return new Response(
      JSON.stringify({
        error: 'Setup is disabled until INSTALLER_SECRET is set on the server.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (
    configuredInstallerSecret &&
    !secretsMatch(installerSecret ?? '', configuredInstallerSecret)
  ) {
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
    const passwordHash = await hashPassword(password);
    const now = new Date();

    runTransaction(database, (tx) => {
      if (hasUsers(tx as unknown as Database)) {
        throw new SetupAlreadyCompleteError();
      }

      tx.insert(schema.user)
        .values({
          id: userId,
          name: name.trim(),
          email: email.toLowerCase(),
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      tx.insert(schema.account)
        .values({
          id: accountId,
          accountId: userId,
          providerId: 'credential',
          userId: userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      tx.insert(schema.workspaces)
        .values({
          id: workspaceId,
          name: workspaceName.trim(),
          status: 'active',
          created_at: now,
          updated_at: now,
        })
        .run();

      tx.insert(schema.users)
        .values({
          id: userId,
          workspace_id: workspaceId,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          name: name.trim(),
          role: 'admin',
          email_verified_at: now,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        })
        .run();

      tx.insert(schema.accountCategories)
        .values(AccountCategoryService.buildDefaultCategoryRows(workspaceId, userId, now))
        .run();
    });

    await invalidateTags([CacheTags.workspace(workspaceId)]);

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

    logError('Installer setup failed', error);
    return new Response(JSON.stringify({ error: 'Setup failed. Check server logs for details.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
