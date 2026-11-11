import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { eq } from 'drizzle-orm';
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { db, resetDb } from '@/db';
import { account, user as authUsers, users, workspaces } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { setTestEnv } from '@/lib/env';
import { POST } from '@/pages/api/installer/setup';
import { AccountCategoryService } from '@/services/account-category.service';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalInstallerSecret = process.env.INSTALLER_SECRET;
const originalBuildDefaultCategoryRows = AccountCategoryService.buildDefaultCategoryRows;

let testDbPath = '';

function deleteSqliteArtifacts(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    const filePath = `${dbPath}${suffix}`;
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}

function setupTestDatabase(dbPath: string) {
  execFileSync('bun', ['run', 'db:migrate'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: dbPath,
    },
    stdio: 'ignore',
  });
}

function createApiContext(body: unknown) {
  return {
    request: new Request('http://localhost/api/installer/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {},
  } as any;
}

describe('POST /api/installer/setup', () => {
  beforeEach(async () => {
    testDbPath = join(import.meta.dir, `installer-setup-${Date.now()}-${Math.random()}.sqlite`);
    deleteSqliteArtifacts(testDbPath);

    process.env.DATABASE_URL = testDbPath;
    delete process.env.INSTALLER_SECRET;

    setupTestDatabase(testDbPath);
    resetDb();
  });

  afterEach(async () => {
    setTestEnv(null);
    AccountCategoryService.buildDefaultCategoryRows = originalBuildDefaultCategoryRows;
    resetDb();

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalInstallerSecret === undefined) {
      delete process.env.INSTALLER_SECRET;
    } else {
      process.env.INSTALLER_SECRET = originalInstallerSecret;
    }

    deleteSqliteArtifacts(testDbPath);
  });

  it('stores a runtime-compatible credential hash for the installer admin', async () => {
    const password = 'InstallerPassword123!';

    const response = await POST(
      createApiContext({
        workspaceName: 'Installer Workspace',
        name: 'Installer Admin',
        email: 'installer@example.com',
        password,
      })
    );

    expect(response.status).toBe(201);

    const authUser = await db.query.user.findFirst({
      where: eq(authUsers.email, 'installer@example.com'),
    });

    expect(authUser).toBeDefined();

    const credentialAccount = await db.query.account.findFirst({
      where: (table, { and, eq: equals }) =>
        and(equals(table.userId, authUser!.id), equals(table.providerId, 'credential')),
    });

    expect(credentialAccount?.password).toBeDefined();
    expect(await verifyPassword(password, credentialAccount?.password ?? '')).toBe(true);
  });

  it('returns 401 when installer secret is configured but missing', async () => {
    process.env.INSTALLER_SECRET = 'bootstrap-secret';

    const response = await POST(
      createApiContext({
        workspaceName: 'Installer Workspace',
        name: 'Installer Admin',
        email: 'installer@example.com',
        password: 'InstallerPassword123!',
      })
    );

    expect(response.status).toBe(401);
    expect(
      await db.query.user.findFirst({
        where: eq(authUsers.email, 'installer@example.com'),
      })
    ).toBeUndefined();
  });

  it('allows setup when installer secret is configured and provided', async () => {
    process.env.INSTALLER_SECRET = 'bootstrap-secret';

    const response = await POST(
      createApiContext({
        workspaceName: 'Installer Workspace',
        name: 'Installer Admin',
        email: 'installer@example.com',
        password: 'InstallerPassword123!',
        installerSecret: 'bootstrap-secret',
      })
    );

    expect(response.status).toBe(201);
  });

  describe('in production', () => {
    const payload = {
      workspaceName: 'Installer Workspace',
      name: 'Installer Admin',
      email: 'installer@example.com',
      password: 'InstallerPassword123!',
    };

    async function adminExists() {
      return (
        (await db.query.user.findFirst({
          where: eq(authUsers.email, 'installer@example.com'),
        })) !== undefined
      );
    }

    it('refuses setup when INSTALLER_SECRET is not configured', async () => {
      setTestEnv({ NODE_ENV: 'production', INSTALLER_SECRET: undefined });

      const response = await POST(createApiContext({ ...payload, installerSecret: 'anything' }));

      expect(response.status).toBe(403);
      expect((await response.json()).error).toContain('INSTALLER_SECRET');
      expect(await adminExists()).toBe(false);
    });

    it('refuses setup when NODE_ENV is unset and no secret is configured', async () => {
      setTestEnv({ NODE_ENV: undefined, INSTALLER_SECRET: undefined });

      const response = await POST(createApiContext(payload));

      expect(response.status).toBe(403);
      expect(await adminExists()).toBe(false);
    });

    it('refuses a wrong installer secret', async () => {
      setTestEnv({ NODE_ENV: 'production', INSTALLER_SECRET: 'bootstrap-secret' });

      const response = await POST(
        createApiContext({ ...payload, installerSecret: 'bootstrap-secreT' })
      );

      expect(response.status).toBe(401);
      expect(await adminExists()).toBe(false);
    });

    it('refuses a secret that only shares a prefix with the configured one', async () => {
      setTestEnv({ NODE_ENV: 'production', INSTALLER_SECRET: 'bootstrap-secret' });

      const response = await POST(createApiContext({ ...payload, installerSecret: 'bootstrap' }));

      expect(response.status).toBe(401);
      expect(await adminExists()).toBe(false);
    });

    it('allows setup with the right installer secret', async () => {
      setTestEnv({ NODE_ENV: 'production', INSTALLER_SECRET: 'bootstrap-secret' });

      const response = await POST(
        createApiContext({ ...payload, installerSecret: 'bootstrap-secret' })
      );

      expect(response.status).toBe(201);
      expect(await adminExists()).toBe(true);
    });
  });

  it('returns 409 when setup has already completed', async () => {
    const payload = {
      workspaceName: 'Installer Workspace',
      name: 'Installer Admin',
      email: 'installer@example.com',
      password: 'InstallerPassword123!',
    };

    const firstResponse = await POST(createApiContext(payload));
    const secondResponse = await POST(createApiContext(payload));

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
  });

  it('rolls back installer records when category seeding fails', async () => {
    AccountCategoryService.buildDefaultCategoryRows = mock(() => {
      throw new Error('category seeding failed');
    });

    const response = await POST(
      createApiContext({
        workspaceName: 'Broken Workspace',
        name: 'Broken Admin',
        email: 'broken@example.com',
        password: 'InstallerPassword123!',
      })
    );

    expect(response.status).toBe(500);

    expect(
      await db.query.user.findFirst({
        where: eq(authUsers.email, 'broken@example.com'),
      })
    ).toBeUndefined();
    expect(
      await db.query.users.findFirst({
        where: eq(users.email, 'broken@example.com'),
      })
    ).toBeUndefined();
    expect(
      await db.query.account.findMany({
        where: eq(account.providerId, 'credential'),
      })
    ).toHaveLength(0);
    expect(
      await db.query.workspaces.findMany({
        where: eq(workspaces.name, 'Broken Workspace'),
      })
    ).toHaveLength(0);
  });
});
