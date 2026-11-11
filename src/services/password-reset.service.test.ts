import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  createMemoryDb,
  countRows,
  seedWorkspaceOwner,
  type MemoryDb,
} from '@/db/test-helpers/memory-db';
import { setTestEnv } from '@/lib/env';
import { emailService } from '@/services';
import {
  PASSWORD_RESET_ERRORS,
  PasswordResetError,
  PasswordResetService,
} from './password-reset.service';

const USER_ID = 'user-reset';
const EMAIL = `${USER_ID}@example.test`;

const originalSendPasswordReset = emailService.sendPasswordReset;

let memory: MemoryDb;
let service: PasswordResetService;
let sendPasswordReset: ReturnType<typeof mock>;

beforeEach(() => {
  memory = createMemoryDb();
  seedWorkspaceOwner(memory.raw, 'ws-reset', USER_ID);
  service = new PasswordResetService(memory.db);
  sendPasswordReset = mock(async () => {});
  emailService.sendPasswordReset = sendPasswordReset as typeof emailService.sendPasswordReset;
  setTestEnv({ PUBLIC_URL: 'https://money.example.test' });
});

afterEach(() => {
  emailService.sendPasswordReset = originalSendPasswordReset;
  setTestEnv(null);
  memory.raw.close();
});

/** Requests a reset and returns the raw token from the emailed link. */
async function requestToken(email = EMAIL): Promise<string> {
  await service.requestPasswordReset(email);
  const [{ resetUrl }] = sendPasswordReset.mock.calls.at(-1) as [{ resetUrl: string }];
  return new URL(resetUrl).searchParams.get('token')!;
}

describe('PasswordResetService.requestPasswordReset', () => {
  it('emails a one-hour reset link on PUBLIC_URL to a known user', async () => {
    const token = await requestToken();

    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(sendPasswordReset.mock.calls[0][0]).toEqual({
      to: EMAIL,
      resetUrl: `https://money.example.test/reset-password?token=${token}`,
      expiresIn: '1 hour',
    });
  });

  it('stores only a hash of the token', async () => {
    const token = await requestToken();
    const row = memory.raw.query('SELECT token, user_id FROM password_reset_tokens').get() as {
      token: string;
      user_id: string;
    };

    expect(row.user_id).toBe(USER_ID);
    expect(row.token).not.toBe(token);
    expect(row.token).not.toContain(token);
  });

  it('matches the email case-insensitively', async () => {
    await service.requestPasswordReset(EMAIL.toUpperCase());
    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('returns quietly for an unknown email, so callers cannot probe for accounts', async () => {
    await expect(service.requestPasswordReset('nobody@example.test')).resolves.toBeUndefined();

    expect(sendPasswordReset).not.toHaveBeenCalled();
    expect(countRows(memory.raw, 'password_reset_tokens')).toBe(0);
  });

  it('still resolves when the email provider fails', async () => {
    sendPasswordReset.mockImplementation(async () => {
      throw new Error('provider down');
    });

    await expect(service.requestPasswordReset(EMAIL)).resolves.toBeUndefined();
  });

  it('keeps only the newest token per user', async () => {
    const first = await requestToken();
    const second = await requestToken();

    expect(countRows(memory.raw, 'password_reset_tokens')).toBe(1);
    expect(await service.validateResetToken(first)).toBeNull();
    expect(await service.validateResetToken(second)).toBe(USER_ID);
  });

  for (const email of ['', 'not-an-email', 'a@b']) {
    it(`rejects ${JSON.stringify(email)} as invalid input`, async () => {
      const error = await service.requestPasswordReset(email).catch((caught) => caught);

      expect(error).toBeInstanceOf(PasswordResetError);
      expect(error.code).toBe(PASSWORD_RESET_ERRORS.INVALID_INPUT);
      expect(sendPasswordReset).not.toHaveBeenCalled();
    });
  }
});

describe('PasswordResetService.validateResetToken', () => {
  it('returns the user id for a live token', async () => {
    expect(await service.validateResetToken(await requestToken())).toBe(USER_ID);
  });

  it('returns null for an expired token', async () => {
    const token = await requestToken();
    memory.raw.run('UPDATE password_reset_tokens SET expires_at = 0');

    expect(await service.validateResetToken(token)).toBeNull();
  });

  it('returns null for an unknown or empty token', async () => {
    await requestToken();

    expect(await service.validateResetToken('not-a-real-token')).toBeNull();
    expect(await service.validateResetToken('')).toBeNull();
  });
});

describe('PasswordResetService.consumeResetToken', () => {
  it('makes the token unusable', async () => {
    const token = await requestToken();
    await service.consumeResetToken(token);

    expect(await service.validateResetToken(token)).toBeNull();
    expect(countRows(memory.raw, 'password_reset_tokens')).toBe(0);
  });

  it('leaves other tokens alone when given an unknown or empty one', async () => {
    const token = await requestToken();
    await service.consumeResetToken('not-a-real-token');
    await service.consumeResetToken('');

    expect(await service.validateResetToken(token)).toBe(USER_ID);
  });
});
