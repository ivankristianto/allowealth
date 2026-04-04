import { describe, expect, it, mock, beforeEach } from 'bun:test';

// Mock MigrationService before importing the guard
let mockPending = false;

// @ts-expect-error -- mock.module is a bun:test runtime API not yet in TS definitions
mock.module('@/services/migration.service', () => ({
  MigrationService: {
    isMigrationPending: async () => mockPending,
  },
}));

// Import after mock is set up
const { migrationGuard } = await import('@/middleware/migration-guard');

function makeContext(pathname: string, role?: string) {
  return {
    url: new URL(`http://localhost${pathname}`),
    locals: {
      user: role ? { role } : null,
    },
    redirect: (url: string, status: number) =>
      new Response(null, { status, headers: { Location: url } }),
  } as any;
}

const next = () => Promise.resolve(new Response('OK', { status: 200 }));

describe('migrationGuard — not pending', () => {
  beforeEach(() => {
    mockPending = false;
  });

  it('calls next() when migration is not pending', async () => {
    const ctx = makeContext('/dashboard', 'admin');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(200);
  });
});

describe('migrationGuard — passlist', () => {
  beforeEach(() => {
    mockPending = true;
  });

  it('calls next() for /upgrade even if pending', async () => {
    const ctx = makeContext('/upgrade', 'member');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(200);
  });

  it('calls next() for /api/admin/upgrade/run even if pending', async () => {
    const ctx = makeContext('/api/admin/upgrade/run', 'super_admin');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(200);
  });

  it('calls next() for /api/admin/upgrade/status even if pending', async () => {
    const ctx = makeContext('/api/admin/upgrade/status', 'super_admin');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(200);
  });

  it('calls next() for /_astro/ assets even if pending', async () => {
    const ctx = makeContext('/_astro/main.js', 'member');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(200);
  });

  it('calls next() for /favicon.ico even if pending', async () => {
    const ctx = makeContext('/favicon.ico', 'member');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(200);
  });

  it('does NOT passlist /upgrade-other (exact match only)', async () => {
    const ctx = makeContext('/upgrade-other');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(503);
  });
});

describe('migrationGuard — pending', () => {
  beforeEach(() => {
    mockPending = true;
  });

  it('redirects super_admin to /upgrade', async () => {
    const ctx = makeContext('/dashboard', 'super_admin');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(302);
    expect((res as Response).headers.get('location')).toBe('/upgrade');
  });

  it('redirects admin to /upgrade', async () => {
    const ctx = makeContext('/dashboard', 'admin');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(302);
    expect((res as Response).headers.get('location')).toBe('/upgrade');
  });

  it('redirects member to /upgrade', async () => {
    const ctx = makeContext('/dashboard', 'member');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(302);
    expect((res as Response).headers.get('location')).toBe('/upgrade');
  });

  it('returns 503 for unauthenticated user', async () => {
    const ctx = makeContext('/dashboard');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).status).toBe(503);
  });

  it('503 response includes Retry-After header', async () => {
    const ctx = makeContext('/dashboard');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).headers.get('retry-after')).toBe('60');
  });

  it('503 response includes Cache-Control no-store header', async () => {
    const ctx = makeContext('/dashboard');
    const res = await migrationGuard(ctx, next);
    expect((res as Response).headers.get('cache-control')).toBe('no-store');
  });

  it('503 response is HTML with maintenance message', async () => {
    const ctx = makeContext('/dashboard');
    const res = await migrationGuard(ctx, next);
    const html = await (res as Response).text();
    expect(html).toContain('maintenance');
    expect((res as Response).headers.get('content-type')).toContain('text/html');
  });
});
