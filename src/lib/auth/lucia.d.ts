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
    };
  }
}
