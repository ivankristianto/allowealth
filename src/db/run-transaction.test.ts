import { describe, expect, it } from 'bun:test';
import { workspaces } from '@/db/schema/sqlite';
import { runTransaction } from '@/db';
import { countRows, createMemoryDb } from '@/db/test-helpers/memory-db';

describe('runTransaction', () => {
  it('rolls back every statement when the callback throws', () => {
    const { db, raw } = createMemoryDb();

    expect(() =>
      runTransaction(db, (tx) => {
        tx.insert(workspaces).values({ id: 'ws-a', name: 'A' }).run();
        tx.insert(workspaces).values({ id: 'ws-b', name: 'B' }).run();
        expect(raw.inTransaction).toBe(true);
        throw new Error('boom');
      })
    ).toThrow('boom');

    expect(raw.inTransaction).toBe(false);
    expect(countRows(raw, 'workspaces')).toBe(0);
  });

  it('commits and returns the callback result on success', () => {
    const { db, raw } = createMemoryDb();

    const result = runTransaction(db, (tx) => {
      tx.insert(workspaces).values({ id: 'ws-a', name: 'A' }).run();
      return tx.select().from(workspaces).all().length;
    });

    expect(result).toBe(1);
    expect(countRows(raw, 'workspaces')).toBe(1);
  });
});
