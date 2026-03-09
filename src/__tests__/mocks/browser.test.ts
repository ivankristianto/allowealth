import { afterEach, describe, expect, test } from 'bun:test';

import { createMockCrypto } from './browser';

describe('createMockCrypto', () => {
  const mockCrypto = createMockCrypto();

  afterEach(() => {
    mockCrypto.uninstall();
  });

  test('preserves getRandomValues while mocking randomUUID', () => {
    const bytes = new Uint8Array(4);
    const originalRandomUUID = globalThis.crypto.randomUUID;

    mockCrypto.install();

    expect(globalThis.crypto.randomUUID()).toBe('00000000-0000-0000-0000-000000000000');
    expect(() => globalThis.crypto.getRandomValues(bytes)).not.toThrow();

    mockCrypto.uninstall();

    expect(globalThis.crypto.randomUUID).toBe(originalRandomUUID);
    expect(() => globalThis.crypto.getRandomValues(new Uint8Array(4))).not.toThrow();
  });
});
