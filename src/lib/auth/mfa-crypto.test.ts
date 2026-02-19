import { describe, expect, test } from 'bun:test';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from './mfa-crypto';

describe('TOTP secret encryption', () => {
  const testKey = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='; // base64 32-byte key

  test('encrypts and decrypts TOTP secret round-trip', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = await encryptTotpSecret(secret, testKey);
    expect(encrypted).not.toBe(secret);

    const decrypted = await decryptTotpSecret(encrypted, testKey);
    expect(decrypted).toBe(secret);
  });

  test('produces different ciphertext for same input (unique IV)', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted1 = await encryptTotpSecret(secret, testKey);
    const encrypted2 = await encryptTotpSecret(secret, testKey);

    expect(encrypted1).not.toBe(encrypted2);
  });
});

describe('backup codes', () => {
  test('generates 10 codes in XXXX-XXXX format', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);

    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  test('generates unique codes', () => {
    const codes = generateBackupCodes();
    const unique = new Set(codes);
    expect(unique.size).toBe(10);
  });

  test('hashes and verifies backup code', async () => {
    const code = 'ABCD-1234';
    const hash = await hashBackupCode(code);
    expect(hash).not.toBe(code);

    const isValid = await verifyBackupCode(code, hash);
    expect(isValid).toBe(true);
  });

  test('rejects wrong backup code', async () => {
    const hash = await hashBackupCode('ABCD-1234');
    const isValid = await verifyBackupCode('XXXX-9999', hash);
    expect(isValid).toBe(false);
  });

  test('verification is case-insensitive', async () => {
    const hash = await hashBackupCode('ABCD-1234');
    const isValid = await verifyBackupCode('abcd-1234', hash);
    expect(isValid).toBe(true);
  });
});
