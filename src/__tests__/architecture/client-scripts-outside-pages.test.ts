/**
 * Astro registers every .ts file under src/pages as an endpoint, so a client script
 * there becomes a route (`/installer.client`) that throws on `document` when requested.
 */
import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { join } from 'node:path';

const PAGES_DIR = join(import.meta.dir, '..', '..', 'pages');

// `_`-prefixed files are private to Astro and never become routes.
const CLIENT_SCRIPT = /(^|\/)[^_/][^/]*[.-]client\.[cm]?[jt]s$/;

describe('client scripts', () => {
  it('never live under src/pages', () => {
    const offenders = Array.from(new Glob('**/*.{js,ts,mjs,mts}').scanSync({ cwd: PAGES_DIR }))
      .filter((file) => CLIENT_SCRIPT.test(file))
      .sort();

    expect(offenders).toEqual([]);
  });
});
