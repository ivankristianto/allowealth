import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';
import { ARGON2ID_PREFIX } from './password-argon2id';
import { createPasswordHasher } from './password-hasher';
import { Pbkdf2Hasher } from './password-pbkdf2';

const KNOWN_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=2,p=1$KKa335shvrWayGnd1ZwIFoLuZwFVnVFx4UMio6TCIbo$vK8PnpIuF1zweSNXM4H5VfPQURPkSpiDVa1BhbS6GFE';

const authDir = dirname(fileURLToPath(import.meta.url));

function runNodeRuntimeSmoke() {
  const tempDir = mkdtempSync(join(tmpdir(), 'password-runtime-'));
  const smokeOutfile = join(tempDir, 'password-runtime-smoke.mjs');
  const smokeEntry = join(authDir, 'password-runtime-node-smoke.ts');

  execFileSync('bun', ['build', smokeEntry, '--target=node', '--outfile', smokeOutfile], {
    cwd: authDir,
    stdio: 'pipe',
  });

  return JSON.parse(execFileSync('node', [smokeOutfile], { encoding: 'utf8' })) as {
    isBunRuntime: boolean;
    isPbkdf2: boolean;
    hashStartsWithPbkdf2: boolean;
    argon2VerifyResult: boolean;
    roundTripVerified: boolean;
    argon2WarningSeen: boolean;
  };
}

describe('password runtime selection', () => {
  it('selects PBKDF2 when Bun runtime is unavailable', () => {
    expect(createPasswordHasher(false)).toBeInstanceOf(Pbkdf2Hasher);
  });

  it('does not export internal facade helpers from password.ts', async () => {
    const mod = await import('./password');

    expect('createPasswordFacade' in mod).toBe(false);
  });

  it('hashes with PBKDF2 and refuses Argon2id verification on a non-Bun runtime', () => {
    const result = runNodeRuntimeSmoke();

    expect(result.isBunRuntime).toBe(false);
    expect(result.isPbkdf2).toBe(true);
    expect(result.hashStartsWithPbkdf2).toBe(true);
    expect(result.roundTripVerified).toBe(true);
    expect(result.argon2VerifyResult).toBe(false);
    expect(result.argon2WarningSeen).toBe(true);
  });

  it('continues to recognize Argon2id hashes by prefix in runtime coverage tests', () => {
    expect(KNOWN_ARGON2ID_HASH.startsWith(ARGON2ID_PREFIX)).toBe(true);
  });
});
