import { describe, it, expect, mock } from 'bun:test';
import { createTokenService } from './token.factory';

const futureDate = new Date(Date.now() + 3_600_000);
const pastDate = new Date(Date.now() - 1000);

const mockToken = { id: 'tid', user_id: 'u1', token: 'abc123', expires_at: futureDate };

function makeDb(tokenRow: any = mockToken) {
  return {
    query: {
      tokens: {
        findFirst: mock(() => Promise.resolve(tokenRow)),
      },
    },
    insert: mock(() => ({ values: mock(() => Promise.resolve()) })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  };
}

function makeConfig(db: ReturnType<typeof makeDb>) {
  return {
    getTable: () => 'tokens' as any,
    getQuery: () => db.query.tokens,
    getUserIdCol: () => ({ name: 'user_id' }) as any,
    getTokenCol: () => ({ name: 'token' }) as any,
    getExpiresAtCol: () => ({ name: 'expires_at' }) as any,
  };
}

describe('createTokenService', () => {
  it('createToken returns a 64-char string and inserts row', async () => {
    const db = makeDb();
    const svc = createTokenService(db as any, makeConfig(db));
    const token = await svc.createToken('u1', 60);
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('createToken deletes existing tokens before inserting', async () => {
    const db = makeDb();
    const svc = createTokenService(db as any, makeConfig(db));
    await svc.createToken('u1', 60);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('validateToken returns userId when token is valid and not expired', async () => {
    const db = makeDb(mockToken);
    const svc = createTokenService(db as any, makeConfig(db));
    const result = await svc.validateToken('abc123');
    expect(result).toEqual({ userId: 'u1' });
  });

  it('validateToken returns null when token is expired', async () => {
    const db = makeDb({ ...mockToken, expires_at: pastDate });
    const svc = createTokenService(db as any, makeConfig(db));
    // The factory passes gt(expiresAt, new Date()) to findFirst — driver returns null for expired
    db.query.tokens.findFirst = mock(() => Promise.resolve(null));
    const result = await svc.validateToken('abc123');
    expect(result).toBeNull();
  });

  it('validateToken returns null when token not found', async () => {
    const db = makeDb(null);
    db.query.tokens.findFirst = mock(() => Promise.resolve(null));
    const svc = createTokenService(db as any, makeConfig(db));
    const result = await svc.validateToken('notexist');
    expect(result).toBeNull();
  });

  it('consumeToken deletes the token row', async () => {
    const db = makeDb();
    const svc = createTokenService(db as any, makeConfig(db));
    await svc.consumeToken('abc123');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
