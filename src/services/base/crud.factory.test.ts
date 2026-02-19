import { describe, it, expect, mock } from 'bun:test';
import { createCrudService } from './crud.factory';

const mockRow = { id: '1', workspace_id: 'ws-1', name: 'Test' };

function makeDb() {
  return {
    query: {
      things: {
        findFirst: mock(() => Promise.resolve(mockRow)),
        findMany: mock(() => Promise.resolve([mockRow])),
      },
    },
    insert: mock(() => ({
      values: mock(() => ({ returning: mock(() => Promise.resolve([mockRow])) })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({ returning: mock(() => Promise.resolve([mockRow])) })),
      })),
    })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  };
}

function makeConfig(db: ReturnType<typeof makeDb>) {
  return {
    getTable: () => 'things_table' as any,
    getQuery: () => db.query.things,
    getId: () => ({ name: 'id' }) as any,
    getWorkspaceId: () => ({ name: 'workspace_id' }) as any,
  };
}

describe('createCrudService', () => {
  it('findById calls findFirst with id and workspaceId', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.findById('1', 'ws-1');
    expect(result).toEqual(mockRow);
    expect(db.query.things.findFirst).toHaveBeenCalledTimes(1);
  });

  it('findAll calls findMany with workspaceId', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.findAll('ws-1');
    expect(result).toEqual([mockRow]);
    expect(db.query.things.findMany).toHaveBeenCalledTimes(1);
  });

  it('create inserts and returns row', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.create({ name: 'Test', workspace_id: 'ws-1' });
    expect(result).toEqual(mockRow);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('update modifies and returns updated row', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    const result = await crud.update('1', 'ws-1', { name: 'Updated' });
    expect(result).toEqual(mockRow);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('delete removes row by id and workspaceId', async () => {
    const db = makeDb();
    const crud = createCrudService(db as any, makeConfig(db));
    await crud.delete('1', 'ws-1');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
