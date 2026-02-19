/* eslint-disable no-console -- CLI output is intentional */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Load environment variables from a file into process.env.
 * Parses KEY=VALUE lines, ignoring comments and blank lines.
 */
export function loadEnvFile(filename: string): void {
  const filepath = resolve(import.meta.dir, '../../../', filename);

  if (!existsSync(filepath)) {
    console.error(`Environment file not found: ${filename}`);
    process.exit(1);
  }

  const content = readFileSync(filepath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }

  console.log(`Loaded environment from ${filename}`);
}
