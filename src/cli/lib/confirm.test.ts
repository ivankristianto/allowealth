import { describe, expect, it } from 'bun:test';
import { requireDestructiveConfirmation } from './confirm';

describe('requireDestructiveConfirmation', () => {
  it('bypasses confirmation when yes is true', async () => {
    let askCalled = false;

    await expect(
      requireDestructiveConfirmation({
        yes: true,
        ask: async () => {
          askCalled = true;
          return 'NOPE';
        },
      })
    ).resolves.toBeUndefined();

    expect(askCalled).toBeFalse();
  });

  it('throws when confirmation is unavailable without yes', async () => {
    await expect(
      requireDestructiveConfirmation({
        isConfirmationAvailable: () => false,
      })
    ).rejects.toThrow('Confirmation is required but unavailable');
  });

  it('throws when answer does not match expected value', async () => {
    await expect(
      requireDestructiveConfirmation({
        ask: async () => 'no',
        isConfirmationAvailable: () => true,
      })
    ).rejects.toThrow('Confirmation declined');
  });

  it('resolves when answer matches expected value', async () => {
    await expect(
      requireDestructiveConfirmation({
        ask: async () => 'DELETE',
        isConfirmationAvailable: () => true,
      })
    ).resolves.toBeUndefined();
  });
});
