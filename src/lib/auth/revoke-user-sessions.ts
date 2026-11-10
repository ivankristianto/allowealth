import { auth } from './server';

/**
 * Revoke every session of a user, including the copies Better Auth keeps in
 * secondary storage (Redis), which a direct delete of session rows misses.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const authContext = await auth.$context;
  await authContext.internalAdapter.deleteUserSessions(userId);
}
