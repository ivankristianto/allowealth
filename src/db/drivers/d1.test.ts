import { describe, it, expect } from 'bun:test';
import { createD1Driver } from './d1';

describe('createD1Driver', () => {
  it('should throw error when D1 binding is not provided', () => {
    expect(() => createD1Driver(null as any)).toThrow('D1 database binding is required');
  });

  it('should return driver with exec method', () => {
    const mockD1 = {
      exec: () => Promise.resolve({ count: 0, duration: 0 }),
      prepare: () => ({
        bind: () => ({
          all: () => ({ results: [] }),
          first: () => null,
          run: () => ({ results: [], success: true }),
        }),
      }),
    };
    const driver = createD1Driver(mockD1 as any);
    expect(driver.exec).toBeDefined();
    expect(driver.prepare).toBeDefined();
    expect(driver._raw).toBe(mockD1);
  });
});
