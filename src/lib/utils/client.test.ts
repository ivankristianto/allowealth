import { afterEach, describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as realAuthClient from '@/lib/auth/client';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';

let signOutError: null | { message: string } = null;
const signOut = mock(async () => ({ error: signOutError }));
mockModuleForFile('@/lib/auth/client', realAuthClient, () => ({ authClient: { signOut } }));

const { performLogout } = await import('./client');

describe('performLogout', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  afterEach(() => {
    signOut.mockClear();
    signOutError = null;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as Record<string, unknown>).window;
  });

  // Every protected layout imports this module, so a static import ships the auth client on every page.
  it('loads the auth client only when logout runs', () => {
    const source = readFileSync(new URL('./client.ts', import.meta.url), 'utf8');
    const authImports = new Bun.Transpiler({ loader: 'ts' })
      .scanImports(source)
      .filter((entry) => entry.path === '@/lib/auth/client');

    expect(authImports.map((entry) => entry.kind)).toEqual(['dynamic-import']);
  });

  it('signs out and runs the callback before redirecting', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: { location: { href: '/dashboard' } },
      configurable: true,
      writable: true,
    });
    const onBeforeRedirect = mock(() => {});
    // Run the redirect timer inline so it cannot fire after this test restores window.
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof setTimeout;

    try {
      await performLogout(onBeforeRedirect);
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onBeforeRedirect).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/login');
  });

  it('skips the callback when sign-out fails', async () => {
    signOutError = { message: 'nope' };
    const onBeforeRedirect = mock(() => {});

    await performLogout(onBeforeRedirect);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onBeforeRedirect).not.toHaveBeenCalled();
  });
});
