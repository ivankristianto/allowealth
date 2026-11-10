import { describe, expect, it } from 'bun:test';
import { safeParse } from 'valibot';
import { updatePasswordSchema } from './user.service';

describe('updatePasswordSchema', () => {
  it('rejects a missing old password', () => {
    const result = safeParse(updatePasswordSchema, {
      oldPassword: '',
      newPassword: 'ValidPassword123!',
    });

    expect(result.success).toBe(false);
    expect(result.issues?.[0]?.message).toBe('Old password is required');
  });

  it('rejects weak new passwords', () => {
    const result = safeParse(updatePasswordSchema, {
      oldPassword: 'CurrentPassword123!',
      newPassword: 'abc',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a 12 character password with letters and numbers', () => {
    const result = safeParse(updatePasswordSchema, {
      oldPassword: 'CurrentPassword123!',
      newPassword: 'Password123!',
    });

    expect(result.success).toBe(true);
  });
});
