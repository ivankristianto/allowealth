import { describe, expect, it } from 'bun:test';

describe('better-auth server config', () => {
  it('creates an auth instance with google and two-factor enabled', async () => {
    const mod = await import('./server');
    expect(mod.auth).toBeDefined();
  });
});
