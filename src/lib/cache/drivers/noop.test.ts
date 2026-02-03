import { describe, it, expect } from 'bun:test';
import { NoopDriver } from './noop';

describe('NoopDriver', () => {
  const driver = new NoopDriver();

  it('should always return null on get', async () => {
    expect(await driver.get('any-key')).toBeNull();
  });

  it('should not throw on set', async () => {
    await expect(driver.set('key', 'value')).resolves.toBeUndefined();
  });

  it('should not throw on delete', async () => {
    await expect(driver.delete('key')).resolves.toBeUndefined();
  });

  it('should not throw on invalidateByTags', async () => {
    await expect(driver.invalidateByTags(['tag1', 'tag2'])).resolves.toBeUndefined();
  });
});
