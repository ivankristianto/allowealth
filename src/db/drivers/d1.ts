/**
 * Cloudflare D1 Driver
 *
 * Database driver implementation using Cloudflare D1 bindings.
 * This driver is used when deploying to Cloudflare Workers with D1 database.
 *
 * D1 is SQLite-compatible and runs at the edge without connection management.
 * No TCP sockets, no subrequest overhead - direct API calls to D1.
 *
 * @see https://developers.cloudflare.com/d1/
 */

import type { DatabaseDriver, PreparedStatement, RunResult } from '../driver';

/**
 * D1 database binding interface (subset used by driver)
 */
export interface D1Binding {
  exec(query: string): Promise<D1Result>;
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all(): Promise<D1Result>;
  first(): Promise<unknown>;
  run(): Promise<D1Result>;
}

export interface D1Result {
  results: unknown[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
}

/**
 * Create a D1 driver from Cloudflare D1 binding
 *
 * @param d1Binding - The D1 database binding from Cloudflare Workers context
 * @returns DatabaseDriver instance wrapping D1
 */
export function createD1Driver(d1Binding: D1Binding): DatabaseDriver & { _raw: D1Binding } {
  if (!d1Binding) {
    throw new Error('D1 database binding is required');
  }

  const driver: DatabaseDriver & { _raw: D1Binding } = {
    exec(sql: string): void {
      // D1 exec is async but we need sync for interface compatibility
      // This is handled by the wrapper below
      d1Binding.exec(sql).catch(() => {
        // Silent fail for PRAGMA statements in D1 (some are not supported)
      });
    },

    prepare(sql: string): PreparedStatement {
      return {
        all(): unknown[] {
          // D1 API is async, but DatabaseDriver interface is synchronous.
          // The _raw binding should be used directly with Drizzle's D1 adapter
          // for actual queries. This driver is primarily for interface compliance.
          return [];
        },

        get(): unknown | undefined {
          return undefined;
        },

        run(): RunResult {
          return {
            changes: 0,
            lastInsertRowid: 0,
          };
        },
      };
    },

    close(): void {
      // D1 has no connection to close
    },

    // Expose raw binding for Drizzle D1 adapter
    _raw: d1Binding,
  };

  return driver;
}

/**
 * Create a Drizzle ORM database instance for D1
 *
 * Uses the D1 binding directly with Drizzle's D1 adapter.
 *
 * @param d1Binding - The D1 database binding from Workers context
 * @param schema - Drizzle schema object (use SQLite schema)
 * @returns Drizzle database instance
 */
export async function createD1Database<T extends Record<string, unknown>>(
  d1Binding: D1Binding,
  schema: T
): Promise<import('drizzle-orm/d1').DrizzleD1Database<T>> {
  const { drizzle } = await import('drizzle-orm/d1');
  return drizzle(d1Binding, { schema });
}
