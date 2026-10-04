import { describe, expect, it } from 'bun:test';
import { UsageError, withDirectiveErrors } from './runtime';
import { DetectionError } from './resolve';

describe('withDirectiveErrors', () => {
  it('returns 0 when the command succeeds', async () => {
    expect(await withDirectiveErrors(async () => undefined)).toBe(0);
  });

  it('passes an explicit exit code through', async () => {
    expect(await withDirectiveErrors(async () => 1)).toBe(1);
  });

  it('turns a directive abort into exit 1 without a stack trace', async () => {
    expect(
      await withDirectiveErrors(async () => {
        throw new DetectionError('Add it to `accounts`.');
      })
    ).toBe(1);
    expect(
      await withDirectiveErrors(async () => {
        throw new UsageError('Pass --month.');
      })
    ).toBe(1);
  });

  it('rethrows an unexpected error so its trace survives', async () => {
    expect(
      withDirectiveErrors(async () => {
        throw new TypeError('genuine bug');
      })
    ).rejects.toThrow(/genuine bug/);
  });
});
