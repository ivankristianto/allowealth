/**
 * D1 HTTP Driver (CLI)
 *
 * Database driver for accessing remote Cloudflare D1 via REST API.
 * Uses drizzle-orm/sqlite-proxy with a callback that calls the D1 query endpoint.
 *
 * This driver is used by CLI commands (`--target d1`) to interact with the
 * production D1 database without a Workers runtime.
 *
 * Requires CLOUDFLARE_API_TOKEN (or legacy CLOUDFLARE_TOKEN) with D1 Edit permissions.
 *
 * @see https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getEnv } from '@/lib/env';

function getRequire() {
  return createRequire(import.meta.url);
}

interface WranglerD1Config {
  accountId: string;
  databaseId: string;
}

/**
 * Resolve the remote D1 identifiers from CI/local env or fall back to wrangler.toml.
 */
export function resolveD1HttpConfig(
  projectRoot: string,
  env: NodeJS.ProcessEnv = process.env
): WranglerD1Config {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = env.D1_DATABASE_ID;

  if (accountId && databaseId) {
    return { accountId, databaseId };
  }

  return readWranglerConfig(projectRoot);
}

/**
 * Resolve the Cloudflare token for the D1 HTTP driver.
 */
export function getD1HttpToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env.CLOUDFLARE_API_TOKEN ?? env.CLOUDFLARE_TOKEN;

  if (!token) {
    throw new Error(
      'Cloudflare token is required for remote D1 access.\n' +
        'Set CLOUDFLARE_API_TOKEN (or legacy CLOUDFLARE_TOKEN) with D1 Edit permissions.'
    );
  }

  return token;
}

/**
 * Parse account_id and database_id from wrangler.toml
 */
export function readWranglerConfig(projectRoot: string): WranglerD1Config {
  const wranglerPath = resolve(projectRoot, 'wrangler.toml');
  const content = readFileSync(wranglerPath, 'utf-8');

  const accountIdMatch = content.match(/^account_id\s*=\s*"([^"]+)"/m);
  const databaseIdMatch = content.match(/^database_id\s*=\s*"([^"]+)"/m);

  if (!accountIdMatch) {
    throw new Error('account_id not found in wrangler.toml');
  }
  if (!databaseIdMatch) {
    throw new Error('database_id not found in wrangler.toml. Is [[d1_databases]] configured?');
  }

  return {
    accountId: accountIdMatch[1],
    databaseId: databaseIdMatch[1],
  };
}

/**
 * Create a Drizzle ORM database instance backed by D1 REST API
 *
 * Uses drizzle-orm/sqlite-proxy with an async callback that sends queries
 * to the Cloudflare D1 HTTP API. The callback converts D1's object-format
 * results to positional arrays as required by sqlite-proxy.
 *
 * @param schema - Drizzle schema object (SQLite schema)
 * @returns Drizzle database instance
 */
export function createD1HttpDatabase<T extends Record<string, unknown>>(schema: T) {
  const token = getD1HttpToken({
    CLOUDFLARE_API_TOKEN: getEnv('CLOUDFLARE_API_TOKEN'),
    CLOUDFLARE_TOKEN: getEnv('CLOUDFLARE_TOKEN'),
  });

  // Find project root (where wrangler.toml lives)
  const projectRoot = resolve(import.meta.dir, '../../..');
  const { accountId, databaseId } = resolveD1HttpConfig(projectRoot);

  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const dynamicRequire = getRequire();
  const { drizzle } = dynamicRequire('drizzle-orm/sqlite-proxy');

  return drizzle(
    async (sql: string, params: unknown[], method: string) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`D1 API error (${response.status}): ${text}`);
      }

      const json = (await response.json()) as {
        success: boolean;
        errors?: Array<{ message: string }>;
        result?: Array<{
          results: Array<Record<string, unknown>>;
          success: boolean;
        }>;
      };

      if (!json.success) {
        const errors = json.errors?.map((e) => e.message).join(', ') || 'Unknown error';
        throw new Error(`D1 query failed: ${errors}`);
      }

      const result = json.result?.[0];
      if (!result) {
        return { rows: [] };
      }

      // Check statement-level success (envelope can succeed while statement fails)
      if (!result.success) {
        throw new Error(`D1 statement failed: ${sql}`);
      }

      return mapD1Result(result.results || [], method);
    },
    { schema }
  );
}

/**
 * Convert D1 API object-format results to sqlite-proxy's expected format.
 *
 * sqlite-proxy expects:
 * - 'run': `{ rows: [] }`
 * - 'get': `{ rows: [val1, val2, ...] }` (single row as positional values, or `[]` for not found)
 * - 'all'/'values': `{ rows: [[val1, val2], [val1, val2], ...] }`
 */
export function mapD1Result(
  rows: Array<Record<string, unknown>>,
  method: string
): { rows: unknown[] } {
  if (method === 'run') {
    return { rows: [] };
  }

  if (rows.length === 0) {
    return { rows: [] };
  }

  const columns = Object.keys(rows[0]);

  if (method === 'get') {
    return { rows: columns.map((col) => rows[0][col]) };
  }

  // 'all' and 'values'
  return {
    rows: rows.map((row) => columns.map((col) => row[col])),
  };
}
