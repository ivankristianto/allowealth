/**
 * D1 Local Driver (CLI)
 *
 * Opens wrangler's local D1 SQLite file directly via bun:sqlite.
 * Used by CLI commands (`--target d1-local`) to interact with the
 * local D1 emulation database created by `wrangler dev`.
 *
 * The local D1 state lives at:
 *   .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
 *
 * @see https://developers.cloudflare.com/d1/
 */

import { readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const D1_STATE_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

/**
 * Find the local D1 SQLite database file created by wrangler dev
 *
 * Scans the wrangler local state directory for .sqlite files.
 * Takes the first one found (typically there's only one D1 database).
 *
 * @param projectRoot - Project root directory (where .wrangler/ lives)
 * @returns Absolute path to the SQLite file
 * @throws Error if no local D1 database is found
 */
export function findLocalD1Path(projectRoot: string): string {
  const stateDir = resolve(projectRoot, D1_STATE_DIR);

  if (!existsSync(stateDir)) {
    throw new Error(
      `Local D1 state directory not found: ${D1_STATE_DIR}\n` +
        'Run `wrangler dev` or `wrangler d1 execute allowealth-db --local --command "SELECT 1"` ' +
        'to initialize local D1 state.'
    );
  }

  const files = readdirSync(stateDir).filter((f) => f.endsWith('.sqlite'));

  if (files.length === 0) {
    throw new Error(
      `No .sqlite files found in ${D1_STATE_DIR}\n` +
        'Run `wrangler dev` to initialize local D1 state.'
    );
  }

  return join(stateDir, files[0]);
}
