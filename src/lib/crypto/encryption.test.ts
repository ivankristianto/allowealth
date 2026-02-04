import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { encrypt, decrypt, generateEncryptionKey } from './encryption';
import { setTestEnv } from '@/lib/env';

describe('Encryption', () => {
  beforeAll(() => {
    // Set a test encryption key (32 bytes base64 encoded)
    setTestEnv({
      EMAIL_ENCRYPTION_KEY: 'tDEmsRTMP7szCIbk9KWwzIOdkup1344oqOqQscCLRCY=',
    });
  });

  afterAll(() => {
    setTestEnv(null);
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'my-secret-api-key-12345';

      const encrypted = encrypt(plaintext);
      expect(encrypted).toStartWith('aes256gcm:');

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same-text';

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'API密钥🔐测试';

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow();
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'tampereddata';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 32-byte base64 encoded key', () => {
      const key = generateEncryptionKey();

      // Base64 of 32 bytes = 44 characters (with padding)
      expect(key.length).toBe(44);

      // Should be valid base64
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});
