import { describe, expect, it } from 'bun:test';
import type { IDatabase } from '@/db';
import { UserService } from './user.service';

const fakeDb = {} as unknown as IDatabase;

describe('UserService validation', () => {
  const service = new UserService(fakeDb);

  it('rejects a missing old password', async () => {
    await expect(
      service.updatePassword('user-1', {
        oldPassword: '',
        newPassword: 'ValidPassword123!',
      })
    ).rejects.toThrow('Old password is required');
  });

  it('rejects weak new passwords', async () => {
    await expect(
      service.updatePassword('user-1', {
        oldPassword: 'CurrentPassword123!',
        newPassword: 'abc',
      })
    ).rejects.toThrow();
  });
});
