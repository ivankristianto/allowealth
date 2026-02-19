import { describe, expect, mock, test } from 'bun:test';
import type { IDatabase } from '@/db';
import { hashBackupCode } from '@/lib/auth/mfa-crypto';
import { MfaService } from './mfa.service';

function createDbMock(options?: {
  mfaRecord?: { id: string; mfa_enabled: boolean } | null;
  backupCodes?: Array<{ id: string; code_hash: string; used_at: Date | null }>;
  updateResult?: Array<{ id: string }>;
}) {
  const findMfa = mock(() => Promise.resolve(options?.mfaRecord ?? null));
  const findBackupCodes = mock(() => Promise.resolve(options?.backupCodes ?? []));
  const returning = mock(() => Promise.resolve(options?.updateResult ?? []));
  const where = mock(() => ({ returning }));
  const set = mock(() => ({ where }));
  const update = mock(() => ({ set }));

  const db: Partial<IDatabase> = {
    query: {
      userMfa: {
        findFirst: findMfa,
        findMany: mock(() => Promise.resolve([])),
      },
      userMfaBackupCodes: {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: findBackupCodes,
      },
    },
    update,
    insert: mock(() => ({
      values: mock(() => Promise.resolve([])),
    })),
    delete: mock(() => ({
      where: mock(() => Promise.resolve(undefined)),
    })),
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => Promise.resolve([])),
        groupBy: mock(() => ({ where: mock(() => Promise.resolve([])) })),
      })),
    })),
    transaction: mock(async (callback: (tx: IDatabase) => Promise<unknown>) =>
      callback(db as IDatabase)
    ),
  };

  return {
    db: db as IDatabase,
    spies: {
      findMfa,
      findBackupCodes,
      update,
      set,
      where,
      returning,
    },
  };
}

describe('MfaService', () => {
  test('getStatus returns disabled when user has no MFA record', async () => {
    const { db } = createDbMock({ mfaRecord: null });
    const service = new MfaService(db);

    const status = await service.getStatus('user-1');

    expect(status).toEqual({
      enabled: false,
      hasBackupCodes: false,
      backupCodesRemaining: 0,
    });
  });

  test('getStatus returns enabled with backup code count', async () => {
    const { db } = createDbMock({
      mfaRecord: { id: 'mfa-1', mfa_enabled: true },
      backupCodes: [
        { id: 'bc-1', code_hash: 'hash-1', used_at: null },
        { id: 'bc-2', code_hash: 'hash-2', used_at: null },
        { id: 'bc-3', code_hash: 'hash-3', used_at: null },
      ],
    });
    const service = new MfaService(db);

    const status = await service.getStatus('user-1');

    expect(status).toEqual({
      enabled: true,
      hasBackupCodes: true,
      backupCodesRemaining: 3,
    });
  });

  test('verifyAndConsumeBackupCode returns false when MFA is disabled', async () => {
    const { db, spies } = createDbMock({
      mfaRecord: { id: 'mfa-1', mfa_enabled: false },
    });
    const service = new MfaService(db);

    const result = await service.verifyAndConsumeBackupCode('user-1', 'ABCD-1234');

    expect(result).toBe(false);
    expect(spies.findBackupCodes).not.toHaveBeenCalled();
  });

  test('verifyAndConsumeBackupCode consumes a valid backup code', async () => {
    const code = 'ABCD-1234';
    const hashedCode = await hashBackupCode(code);
    const { db, spies } = createDbMock({
      mfaRecord: { id: 'mfa-1', mfa_enabled: true },
      backupCodes: [{ id: 'bc-1', code_hash: hashedCode, used_at: null }],
      updateResult: [{ id: 'bc-1' }],
    });
    const service = new MfaService(db);

    const result = await service.verifyAndConsumeBackupCode('user-1', code);

    expect(result).toBe(true);
    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.returning).toHaveBeenCalledTimes(1);
  });

  test('verifyAndConsumeBackupCode fails when concurrent request already consumed code', async () => {
    const code = 'ABCD-1234';
    const hashedCode = await hashBackupCode(code);
    const { db, spies } = createDbMock({
      mfaRecord: { id: 'mfa-1', mfa_enabled: true },
      backupCodes: [{ id: 'bc-1', code_hash: hashedCode, used_at: null }],
      updateResult: [],
    });
    const service = new MfaService(db);

    const result = await service.verifyAndConsumeBackupCode('user-1', code);

    expect(result).toBe(false);
    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.returning).toHaveBeenCalledTimes(1);
  });
});
