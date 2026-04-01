import { describe, expect, test, mock, beforeEach } from 'bun:test';
import type { APIContext } from 'astro';

// Bun's mock.module is a runtime API not reflected in @types/bun
const mockModule = (mock as any).module;

// Mock detection functions
const mockIsMigrationApplied = mock(() => true as boolean);
const mockHasUsers = mock(() => true as boolean);
const mockRunSqliteMigrations = mock(() => {});

// Mock only detection and migrate modules — NOT @/db.
// Mocking @/db leaks across the process (bun mock.module is global)
// and breaks other tests like seed.integration.test.ts that import `db`.
mockModule('@/lib/installer/detection', () => ({
  isMigrationApplied: mockIsMigrationApplied,
  hasUsers: mockHasUsers,
}));

mockModule('@/db/migrate', () => ({
  runSqliteMigrations: mockRunSqliteMigrations,
}));

// Import after mocks
const { installerGuard, resetInstallerFlag } = await import('@/middleware/installer');
const originalD1Enabled = process.env.D1_ENABLED;

function createMockContext(pathname: string): APIContext {
  return {
    locals: {},
    request: new Request(`http://localhost${pathname}`),
    url: new URL(`http://localhost${pathname}`),
    redirect: (path: string, status = 302) =>
      new Response(null, { status, headers: { Location: path } }),
  } as unknown as APIContext;
}

const next = mock(() => Promise.resolve(new Response('OK')));

describe('installer middleware', () => {
  beforeEach(() => {
    if (originalD1Enabled === undefined) {
      delete process.env.D1_ENABLED;
    } else {
      process.env.D1_ENABLED = originalD1Enabled;
    }
    mockIsMigrationApplied.mockReset();
    mockIsMigrationApplied.mockReturnValue(true);
    mockHasUsers.mockReset();
    mockHasUsers.mockReturnValue(true);
    mockRunSqliteMigrations.mockReset();
    next.mockClear();
    resetInstallerFlag();
  });

  test('passes through when migrations applied and users exist', async () => {
    const ctx = createMockContext('/dashboard');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('skips static assets', async () => {
    mockHasUsers.mockReturnValue(false);
    mockIsMigrationApplied.mockReturnValue(false);
    const ctx = createMockContext('/_astro/main.js');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockIsMigrationApplied).not.toHaveBeenCalled();
  });

  test('skips installer guard entirely for D1 runtime', async () => {
    process.env.D1_ENABLED = 'true';
    mockHasUsers.mockReturnValue(false);
    mockIsMigrationApplied.mockReturnValue(false);

    const ctx = createMockContext('/dashboard');
    await installerGuard(ctx, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockIsMigrationApplied).not.toHaveBeenCalled();
    expect(mockHasUsers).not.toHaveBeenCalled();
  });

  test('skips public script assets', async () => {
    mockHasUsers.mockReturnValue(false);
    mockIsMigrationApplied.mockReturnValue(false);
    const ctx = createMockContext('/scripts/theme-init.js');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockIsMigrationApplied).not.toHaveBeenCalled();
  });

  test('runs migrations when not applied, then redirects to /installer', async () => {
    mockIsMigrationApplied.mockReturnValue(false);
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/');
    const response = await installerGuard(ctx, next);
    expect(mockRunSqliteMigrations).toHaveBeenCalledTimes(1);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get('Location')).toBe('/installer');
  });

  test('redirects to /installer when no users exist', async () => {
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/login');
    const response = await installerGuard(ctx, next);
    expect((response as Response).headers.get('Location')).toBe('/installer');
  });

  test('allows /installer through when no users exist', async () => {
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/installer');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('allows /api/installer/setup through when no users exist', async () => {
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/api/installer/setup');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('redirects /installer to /login when users exist', async () => {
    const ctx = createMockContext('/installer');
    const response = await installerGuard(ctx, next);
    expect((response as Response).headers.get('Location')).toBe('/login');
  });

  test('returns 500 when migration fails', async () => {
    mockIsMigrationApplied.mockReturnValue(false);
    mockRunSqliteMigrations.mockImplementation(() => {
      throw new Error('permission denied');
    });
    const ctx = createMockContext('/');
    const response = await installerGuard(ctx, next);
    expect((response as Response).status).toBe(500);
  });

  test('returns 500 to all concurrent waiters when migration fails', async () => {
    mockIsMigrationApplied.mockReturnValue(false);
    mockRunSqliteMigrations.mockImplementation(() => {
      throw new Error('permission denied');
    });

    const ctxA = createMockContext('/dashboard');
    const ctxB = createMockContext('/login');
    const [responseA, responseB] = await Promise.all([
      installerGuard(ctxA, next),
      installerGuard(ctxB, next),
    ]);

    expect(mockRunSqliteMigrations).toHaveBeenCalledTimes(1);
    expect((responseA as Response).status).toBe(500);
    expect((responseB as Response).status).toBe(500);
  });
});
