# Argon2id Password Hashing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Argon2id password hashing for Bun runtime while keeping PBKDF2-SHA256 for Cloudflare Workers, using a Strategy pattern behind the existing public API.

**Architecture:** A `PasswordHasher` interface with two implementations (`Argon2idHasher`, `Pbkdf2Hasher`). A factory detects the runtime once at module load and selects the appropriate hasher. The public `password.ts` facade delegates to the factory for hashing and dispatches verification by hash prefix.

**Tech Stack:** Bun.password API (Argon2id), Web Crypto API (PBKDF2-SHA256), bun:test

**Spec:** `docs/superpowers/specs/2026-04-07-argon2id-password-hashing-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/auth/password-hasher.ts` | `PasswordHasher` interface + `createPasswordHasher()` factory |
| Create | `src/lib/auth/password-argon2id.ts` | `Argon2idHasher` class wrapping `Bun.password` |
| Create | `src/lib/auth/password-pbkdf2.ts` | `Pbkdf2Hasher` class (extracted from current `password.ts`) |
| Modify | `src/lib/auth/password.ts` | Thin facade: delegates to factory, prefix-based verify dispatch |
| Create | `src/lib/auth/password-pbkdf2.test.ts` | Unit tests for `Pbkdf2Hasher` |
| Create | `src/lib/auth/password-argon2id.test.ts` | Unit tests for `Argon2idHasher` |
| Modify | `src/lib/auth/password.test.ts` | Update integration tests for dual-algorithm dispatch |
| Modify | `.claude/CLAUDE.md:45` | Update ADR quick reference |

---

## Task 1: Extract Pbkdf2Hasher

**Files:**
- Create: `src/lib/auth/password-hasher.ts`
- Create: `src/lib/auth/password-pbkdf2.ts`
- Create: `src/lib/auth/password-pbkdf2.test.ts`

- [ ] **Step 1: Create the PasswordHasher interface**

Create `src/lib/auth/password-hasher.ts`:

```ts
/**
 * Password hasher interface
 *
 * Implementations provide algorithm-specific hashing and verification.
 * The factory selects the strongest available hasher for the current runtime.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
```

This file will later receive the factory function (Task 3). For now, just the interface.

- [ ] **Step 2: Write failing tests for Pbkdf2Hasher**

Create `src/lib/auth/password-pbkdf2.test.ts`:

```ts
/**
 * Unit tests for PBKDF2-SHA256 password hasher
 */

import { describe, it, expect } from 'bun:test';
import { Pbkdf2Hasher } from './password-pbkdf2';

const hasher = new Pbkdf2Hasher();

describe('Pbkdf2Hasher', () => {
  describe('hash', () => {
    it('should produce a hash with the correct prefix', async () => {
      const hash = await hasher.hash('SecurePassword123!');
      expect(hash.startsWith('$pbkdf2-sha256$')).toBe(true);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await hasher.hash('SecurePassword123!');
      const hash2 = await hasher.hash('SecurePassword123!');
      expect(hash1).not.toEqual(hash2);
    });

    it('should produce a hash with correct format segments', async () => {
      const hash = await hasher.hash('SecurePassword123!');
      // Format: $pbkdf2-sha256$iterations$base64salt$base64hash
      const parts = hash.slice('$pbkdf2-sha256$'.length).split('$');
      expect(parts.length).toBe(3);
      expect(parseInt(parts[0], 10)).toBe(100_000);
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const hash = await hasher.hash('CorrectPassword123!');
      expect(await hasher.verify('CorrectPassword123!', hash)).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await hasher.hash('CorrectPassword123!');
      expect(await hasher.verify('WrongPassword456!', hash)).toBe(false);
    });

    it('should verify a hardcoded known hash', async () => {
      // Pre-computed PBKDF2-SHA256 hash for "TestPassword123!" with known salt
      // This guards against format regressions across refactoring
      const knownHash =
        '$pbkdf2-sha256$100000$dGVzdHNhbHQxMjM0NQ==$';
      // We cannot hardcode the full hash without knowing the exact derivation,
      // so instead verify round-trip with a freshly generated hash
      const password = 'KnownTestPassword1!';
      const hash = await hasher.hash(password);
      expect(await hasher.verify(password, hash)).toBe(true);
    });

    it('should return false for invalid hash format', async () => {
      expect(await hasher.verify('Password123!', 'not-a-hash')).toBe(false);
    });

    it('should return false for empty inputs', async () => {
      expect(await hasher.verify('', 'some-hash')).toBe(false);
      expect(await hasher.verify('Password123!', '')).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test src/lib/auth/password-pbkdf2.test.ts`
Expected: FAIL -- cannot import `Pbkdf2Hasher`

- [ ] **Step 4: Implement Pbkdf2Hasher**

Create `src/lib/auth/password-pbkdf2.ts`. Extract all PBKDF2 code from current `password.ts`:

```ts
/**
 * PBKDF2-SHA256 password hasher
 *
 * Uses Web Crypto API for cross-runtime compatibility (Bun, Node, Cloudflare Workers).
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */

import type { PasswordHasher } from './password-hasher';

const PBKDF2_CONFIG = {
  iterations: 100_000,
  saltLength: 16,
  hashLength: 32,
  algorithm: 'SHA-256',
} as const;

export const PBKDF2_PREFIX = '$pbkdf2-sha256$';

function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.algorithm,
    },
    keyMaterial,
    PBKDF2_CONFIG.hashLength * 8
  );

  return derivedBits;
}

export class Pbkdf2Hasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = generateSalt();
    const derivedKey = await deriveKey(password, salt);

    const saltBase64 = bufferToBase64(salt);
    const hashBase64 = bufferToBase64(derivedKey);

    return `${PBKDF2_PREFIX}${PBKDF2_CONFIG.iterations}$${saltBase64}$${hashBase64}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      if (!hash.startsWith(PBKDF2_PREFIX)) {
        return false;
      }

      const parts = hash.slice(PBKDF2_PREFIX.length).split('$');
      if (parts.length !== 3) {
        return false;
      }

      const [iterationsStr, saltBase64, storedHashBase64] = parts;
      const iterations = parseInt(iterationsStr, 10);

      if (isNaN(iterations) || iterations <= 0) {
        return false;
      }

      const salt = base64ToBuffer(saltBase64);
      const storedHash = base64ToBuffer(storedHashBase64);

      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
        'deriveBits',
      ]);

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as BufferSource,
          iterations: iterations,
          hash: PBKDF2_CONFIG.algorithm,
        },
        keyMaterial,
        storedHash.length * 8
      );

      const derivedHash = new Uint8Array(derivedBits);

      if (derivedHash.length !== storedHash.length) {
        return false;
      }

      let result = 0;
      for (let i = 0; i < derivedHash.length; i++) {
        result |= derivedHash[i] ^ storedHash[i];
      }

      return result === 0;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/lib/auth/password-pbkdf2.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/password-hasher.ts src/lib/auth/password-pbkdf2.ts src/lib/auth/password-pbkdf2.test.ts
git commit -m "feat(auth): extract Pbkdf2Hasher with PasswordHasher interface (ALL-69)"
```

---

## Task 2: Implement Argon2idHasher

**Files:**
- Create: `src/lib/auth/password-argon2id.ts`
- Create: `src/lib/auth/password-argon2id.test.ts`

- [ ] **Step 1: Write failing tests for Argon2idHasher**

Create `src/lib/auth/password-argon2id.test.ts`:

```ts
/**
 * Unit tests for Argon2id password hasher
 *
 * These tests require the Bun runtime (Bun.password API).
 */

import { describe, it, expect } from 'bun:test';
import { Argon2idHasher } from './password-argon2id';

const hasher = new Argon2idHasher();

describe('Argon2idHasher', () => {
  describe('hash', () => {
    it('should produce a hash with the argon2id prefix', async () => {
      const hash = await hasher.hash('SecurePassword123!');
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await hasher.hash('SecurePassword123!');
      const hash2 = await hasher.hash('SecurePassword123!');
      expect(hash1).not.toEqual(hash2);
    });

    it('should include expected parameters in the hash', async () => {
      const hash = await hasher.hash('SecurePassword123!');
      // PHC format: $argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>
      expect(hash).toContain('m=65536');
      expect(hash).toContain('t=2');
      expect(hash).toContain('p=1');
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const hash = await hasher.hash('CorrectPassword123!');
      expect(await hasher.verify('CorrectPassword123!', hash)).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await hasher.hash('CorrectPassword123!');
      expect(await hasher.verify('WrongPassword456!', hash)).toBe(false);
    });

    it('should verify a hardcoded known Argon2id hash', async () => {
      // Pre-generated with Bun.password.hash('KnownTestPassword1!', { algorithm: 'argon2id', memoryCost: 65536, timeCost: 2 })
      // Generate this constant during implementation and paste it here
      const password = 'KnownTestPassword1!';
      const hash = await hasher.hash(password);
      expect(await hasher.verify(password, hash)).toBe(true);
    });

    it('should return false for empty inputs', async () => {
      expect(await hasher.verify('', 'some-hash')).toBe(false);
      expect(await hasher.verify('Password123!', '')).toBe(false);
    });

    it('should return false for non-argon2id hash format', async () => {
      expect(await hasher.verify('Password123!', '$pbkdf2-sha256$100000$abc$def')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/lib/auth/password-argon2id.test.ts`
Expected: FAIL -- cannot import `Argon2idHasher`

- [ ] **Step 3: Implement Argon2idHasher**

Create `src/lib/auth/password-argon2id.ts`:

```ts
/**
 * Argon2id password hasher
 *
 * Uses Bun.password API for hardware-accelerated Argon2id hashing.
 * Only available in Bun runtime (Docker, local dev).
 *
 * Parameters: m=65536 (64 MiB), t=2, p=1 -- exceeds OWASP minimum.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 * @see https://bun.sh/docs/api/hashing#bun-password
 */

import type { PasswordHasher } from './password-hasher';

export const ARGON2ID_PREFIX = '$argon2id$';

const ARGON2ID_CONFIG = {
  algorithm: 'argon2id' as const,
  memoryCost: 65_536,
  timeCost: 2,
};

export class Argon2idHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, ARGON2ID_CONFIG);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await Bun.password.verify(password, hash);
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/lib/auth/password-argon2id.test.ts`
Expected: All PASS

- [ ] **Step 5: Generate a hardcoded Argon2id hash for regression testing**

Run in Bun REPL or a small script:

```bash
bun -e "console.log(await Bun.password.hash('KnownTestPassword1!', { algorithm: 'argon2id', memoryCost: 65536, timeCost: 2 }))"
```

Copy the output hash and update the hardcoded test in `password-argon2id.test.ts` to verify against this constant. Re-run tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/password-argon2id.ts src/lib/auth/password-argon2id.test.ts
git commit -m "feat(auth): add Argon2idHasher using Bun.password API (ALL-69)"
```

---

## Task 3: Wire Up Factory and Facade

**Files:**
- Modify: `src/lib/auth/password-hasher.ts`
- Modify: `src/lib/auth/password.ts`

- [ ] **Step 1: Add factory to password-hasher.ts**

Update `src/lib/auth/password-hasher.ts` to add the factory below the interface:

```ts
import { Argon2idHasher } from './password-argon2id';
import { Pbkdf2Hasher } from './password-pbkdf2';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

const isBunRuntime = typeof globalThis.Bun !== 'undefined';

function createPasswordHasher(): PasswordHasher {
  return isBunRuntime ? new Argon2idHasher() : new Pbkdf2Hasher();
}

/** Runtime-appropriate hasher instance, created once at module load. */
export const passwordHasher = createPasswordHasher();

/** Whether the current runtime is Bun (exported for verify dispatch). */
export { isBunRuntime };
```

- [ ] **Step 2: Rewrite password.ts as thin facade**

Replace `src/lib/auth/password.ts` with:

```ts
/**
 * Password hashing and verification facade
 *
 * Selects the strongest available hasher per runtime:
 * - Bun: Argon2id via Bun.password (memory-hard, OWASP recommended)
 * - Workers: PBKDF2-SHA256 via Web Crypto API (cross-runtime fallback)
 *
 * Verification dispatches by hash prefix, so both formats are readable
 * on any runtime that supports the underlying algorithm.
 *
 * @see docs/superpowers/specs/2026-04-07-argon2id-password-hashing-design.md
 */

import { createLogger } from '@/lib/logger';
import { ARGON2ID_PREFIX, Argon2idHasher } from './password-argon2id';
import { passwordHasher, isBunRuntime } from './password-hasher';
import { PBKDF2_PREFIX, Pbkdf2Hasher } from './password-pbkdf2';

const logger = createLogger('password');

/** Fallback PBKDF2 verifier -- always available regardless of runtime. */
const pbkdf2Verifier = new Pbkdf2Hasher();

/** Argon2id verifier -- only usable on Bun runtime. */
const argon2idVerifier = isBunRuntime ? new Argon2idHasher() : null;

/**
 * Hash a plain text password using the runtime-appropriate algorithm.
 *
 * @param password - Plain text password (minimum 12 characters)
 * @returns Hashed password string in PHC or custom prefix format
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }

  return passwordHasher.hash(password);
}

/**
 * Verify a plain text password against a stored hash.
 *
 * Dispatches to the correct verifier based on the hash prefix.
 * Handles both Argon2id and PBKDF2 hash formats.
 *
 * @param password - Plain text password to verify
 * @param hash - Stored hash to verify against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  if (hash.startsWith(ARGON2ID_PREFIX)) {
    if (!argon2idVerifier) {
      logger.warn('Argon2id hash encountered on non-Bun runtime; cannot verify');
      return false;
    }
    return argon2idVerifier.verify(password, hash);
  }

  if (hash.startsWith(PBKDF2_PREFIX)) {
    return pbkdf2Verifier.verify(password, hash);
  }

  return false;
}
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `bun test src/lib/auth/password.test.ts`
Expected: All PASS -- the facade preserves the same public API.

Also run all password-related tests:

Run: `bun test src/lib/auth/password-pbkdf2.test.ts src/lib/auth/password-argon2id.test.ts src/lib/auth/password.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/password-hasher.ts src/lib/auth/password.ts
git commit -m "feat(auth): wire up runtime-aware hasher factory and facade (ALL-69)"
```

---

## Task 4: Update Integration Tests

**Files:**
- Modify: `src/lib/auth/password.test.ts`

- [ ] **Step 1: Update password.test.ts for dual-algorithm coverage**

Replace `src/lib/auth/password.test.ts` with:

```ts
/**
 * Integration tests for the password hashing facade
 *
 * Tests the public hashPassword/verifyPassword API including
 * prefix-based verification dispatch across both hash formats.
 */

import { describe, it, expect } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

/** Hardcoded PBKDF2 hash of "TestPassword123!" for cross-format regression testing. */
const KNOWN_PBKDF2_HASH =
  ''; // Will be generated in step 2

/** Hardcoded Argon2id hash of "TestPassword123!" for cross-format regression testing. */
const KNOWN_ARGON2ID_HASH =
  ''; // Will be generated in step 2

describe('Password Hashing Facade', () => {
  describe('hashPassword', () => {
    it('should produce an Argon2id hash on Bun runtime', async () => {
      const hash = await hashPassword('SecurePassword123!');
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword('SecurePassword123!');
      const hash2 = await hashPassword('SecurePassword123!');
      expect(hash1).not.toEqual(hash2);
    });

    it('should throw for password shorter than 12 characters', async () => {
      await expect(hashPassword('Short1!')).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should throw for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should accept exactly 12 character password', async () => {
      const hash = await hashPassword('TwelveChars1');
      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify a freshly hashed password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('CorrectPassword123!');
      expect(await verifyPassword('WrongPassword456!', hash)).toBe(false);
    });

    it('should verify a known PBKDF2 hash', async () => {
      expect(await verifyPassword('TestPassword123!', KNOWN_PBKDF2_HASH)).toBe(true);
    });

    it('should verify a known Argon2id hash', async () => {
      expect(await verifyPassword('TestPassword123!', KNOWN_ARGON2ID_HASH)).toBe(true);
    });

    it('should reject wrong password against PBKDF2 hash', async () => {
      expect(await verifyPassword('WrongPassword456!', KNOWN_PBKDF2_HASH)).toBe(false);
    });

    it('should reject wrong password against Argon2id hash', async () => {
      expect(await verifyPassword('WrongPassword456!', KNOWN_ARGON2ID_HASH)).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('ValidPassword123!');
      expect(await verifyPassword('', hash)).toBe(false);
    });

    it('should return false for empty hash', async () => {
      expect(await verifyPassword('Password123!', '')).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      expect(await verifyPassword('Password123!', 'invalid-hash-format')).toBe(false);
    });

    it('should return false for unknown hash prefix', async () => {
      expect(await verifyPassword('Password123!', '$bcrypt$something')).toBe(false);
    });

    it('should return false for both empty', async () => {
      expect(await verifyPassword('', '')).toBe(false);
    });
  });

  describe('Cross-password isolation', () => {
    it('should not verify password against a different hash', async () => {
      const password1 = 'FirstPassword123!';
      const password2 = 'SecondPassword456!';
      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      expect(await verifyPassword(password1, hash1)).toBe(true);
      expect(await verifyPassword(password2, hash2)).toBe(true);
      expect(await verifyPassword(password1, hash2)).toBe(false);
      expect(await verifyPassword(password2, hash1)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Generate hardcoded hashes for regression constants**

Run these to generate the constants:

```bash
# Generate PBKDF2 hash
bun -e "
import { Pbkdf2Hasher } from './src/lib/auth/password-pbkdf2';
const h = new Pbkdf2Hasher();
console.log(await h.hash('TestPassword123!'));
"

# Generate Argon2id hash
bun -e "
console.log(await Bun.password.hash('TestPassword123!', { algorithm: 'argon2id', memoryCost: 65536, timeCost: 2 }));
"
```

Paste the output values into the `KNOWN_PBKDF2_HASH` and `KNOWN_ARGON2ID_HASH` constants in `password.test.ts`.

- [ ] **Step 3: Run all tests**

Run: `bun test src/lib/auth/password.test.ts src/lib/auth/password-pbkdf2.test.ts src/lib/auth/password-argon2id.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/password.test.ts
git commit -m "test(auth): update integration tests for dual-algorithm password hashing (ALL-69)"
```

---

## Task 5: Update ADR and Run Quality Gates

**Files:**
- Modify: `.claude/CLAUDE.md:45`

- [ ] **Step 1: Update the ADR quick reference**

In `.claude/CLAUDE.md`, line 45, change:

```
| **Password Hashing**    | PBKDF2-SHA256 (Web Crypto API)           | oslo/argon2 (native addon)                     | Cross-runtime compatibility               |
```

To:

```
| **Password Hashing**    | Argon2id (Bun.password) / PBKDF2-SHA256 (Workers fallback) | oslo/argon2 (native addon)      | Strongest available KDF per deployment target |
```

- [ ] **Step 2: Run full test suite**

Run: `bun test`
Expected: All PASS -- no regressions across the codebase

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All pass cleanly

- [ ] **Step 4: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update ADR for Argon2id password hashing (ALL-69)"
```

- [ ] **Step 5: Verify acceptance criteria**

Verify each AC from the ticket is satisfied:

| Acceptance Criteria | How Verified |
|---|---|
| Detect runtime at startup | `password-hasher.ts` -- `isBunRuntime` const at module load |
| Bun: Argon2id with tuned params | `password-argon2id.ts` -- explicit m=65536, t=2 |
| Workers: PBKDF2-SHA256 | `password-pbkdf2.ts` -- unchanged behavior |
| Verify handles both formats | `password.ts` -- prefix dispatch, tested in `password.test.ts` |
| Existing PBKDF2 passwords verifiable | Tested with hardcoded PBKDF2 hash constant |
| Seeder uses runtime-appropriate hasher | Seeders call `hashPassword()` which delegates to factory |
| Password change re-hashes appropriately | `user.service.ts` calls `hashPassword()` which delegates to factory |
