import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';
import { ARGON2ID_PREFIX } from './password-argon2id';
import { Argon2idWasmHasher } from './password-argon2id-wasm';
import { createPasswordHasher } from './password-hasher';

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
    isWasm: boolean;
    hashStartsWithArgon2id: boolean;
    argon2Verified: boolean;
    roundTripVerified: boolean;
  };
}

describe('password runtime selection', () => {
  it('selects the WASM Argon2id hasher when Bun runtime is unavailable', () => {
    expect(createPasswordHasher(false)).toBeInstanceOf(Argon2idWasmHasher);
  });

  it('does not export internal facade helpers from password.ts', async () => {
    const mod = await import('./password');

    expect('createPasswordFacade' in mod).toBe(false);
  });

  it('hashes and verifies Argon2id in a real non-Bun runtime', () => {
    const result = runNodeRuntimeSmoke();

    expect(result.isBunRuntime).toBe(false);
    expect(result.isWasm).toBe(true);
    expect(result.hashStartsWithArgon2id).toBe(true);
    expect(result.argon2Verified).toBe(true);
    expect(result.roundTripVerified).toBe(true);
  });

  it('continues to recognize Argon2id hashes by prefix in runtime coverage tests', () => {
    expect(KNOWN_ARGON2ID_HASH.startsWith(ARGON2ID_PREFIX)).toBe(true);
  });
});
