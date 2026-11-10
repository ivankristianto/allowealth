import { basename } from 'node:path';

export const DEFAULT_TEST_DATABASE_URL = 'db/.test.db';

/**
 * Picks the database the test run may touch. DATABASE_URL is ignored on purpose:
 * Bun loads .env before tests, and a checkout's .env can point at real data.
 */
export function resolveTestDatabaseUrl(env: Record<string, string | undefined>): string {
  const url = env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

  if (!basename(url).includes('.test')) {
    throw new Error(
      `Refusing to run tests against "${url}": the test database file name must contain ".test" ` +
        `(e.g. ${DEFAULT_TEST_DATABASE_URL}). Set TEST_DATABASE_URL to choose another test database.`
    );
  }

  return url;
}
