import { describe, it, expect, mock } from 'bun:test';
import { createMetaService } from './meta.factory';

type TestKey = 'key_a' | 'key_b';
const isTestKey = (k: string): k is TestKey => k === 'key_a' || k === 'key_b';

const mockMetaRow = { id: '1', user_id: 'u1', meta_key: 'key_a', meta_value: 'hello' };

function makeDb() {
  return {
    query: {
      userMeta: {
        findFirst: mock(() => Promise.resolve(mockMetaRow)),
        findMany: mock(() => Promise.resolve([mockMetaRow])),
      },
    },
    insert: mock(() => ({
      values: mock(() => ({
        onConflictDoUpdate: mock(() => Promise.resolve()),
      })),
    })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  };
}

function makeConfig(db: ReturnType<typeof makeDb>) {
  return {
    getTable: () => 'user_meta' as any,
    getQuery: () => db.query.userMeta,
    getEntityIdCol: () => ({ name: 'user_id' }) as any,
    getKeyCol: () => ({ name: 'meta_key' }) as any,
    getValueCol: () => ({ name: 'meta_value' }) as any,
    validateKey: isTestKey,
  };
}

describe('createMetaService', () => {
  it('get returns value when row exists', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const result = await meta.get('u1', 'key_a');
    expect(result).toBe('hello');
  });

  it('get returns null when row not found', async () => {
    const db = makeDb();
    db.query.userMeta.findFirst = mock(() => Promise.resolve(null));
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const result = await meta.get('u1', 'key_a');
    expect(result).toBeNull();
  });

  it('set calls insert with onConflictDoUpdate', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    await meta.set('u1', 'key_a', 'new-value');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('set throws on invalid key', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    await expect(meta.set('u1', 'invalid_key' as TestKey, 'v')).rejects.toThrow();
  });

  it('set throws when value exceeds 4KB', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const bigValue = 'x'.repeat(4097);
    await expect(meta.set('u1', 'key_a', bigValue)).rejects.toThrow();
  });

  it('delete calls db.delete', async () => {
    const db = makeDb();
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    await meta.delete('u1', 'key_a');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('getAll returns keyed record', async () => {
    const db = makeDb();
    db.query.userMeta.findMany = mock(() =>
      Promise.resolve([
        { meta_key: 'key_a', meta_value: 'hello' },
        { meta_key: 'key_b', meta_value: 'world' },
      ])
    );
    const meta = createMetaService<TestKey>(db as any, makeConfig(db));
    const result = await meta.getAll('u1');
    expect(result).toEqual({ key_a: 'hello', key_b: 'world' });
  });
});
