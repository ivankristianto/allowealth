/**
 * Lucia type declarations
 *
 * Extends Lucia to include custom user attributes
 */

declare module 'lucia' {
  interface Register {
    Lucia: typeof import('./lucia').auth;
    DatabaseUserAttributes: {
      id: string;
      email: string;
      name: string;
      workspace_id: string;
      role: 'admin' | 'member';
      deleted_at: Date | null;
    };
  }
}
