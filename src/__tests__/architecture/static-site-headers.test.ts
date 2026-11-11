import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Cloudflare Pages serves prerendered HTML outside Astro middleware, so _headers is the only CSP
const STATIC_APPS = ['apps/docs', 'apps/site'] as const;

/** Header lines per path pattern, comments dropped. */
function parseHeadersFile(content: string): Map<string, Map<string, string>> {
  const rules = new Map<string, Map<string, string>>();
  let current: Map<string, string> | undefined;

  for (const line of content.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      rules.set(line.trim(), current);
      continue;
    }
    const separator = line.indexOf(':');
    current?.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return rules;
}

function cspDirective(csp: string, name: string): string[] {
  const directive = csp
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([directiveName]) => directiveName === name);
  return directive?.slice(1) ?? [];
}

const EXECUTABLE_SCRIPT_TYPES = new Set([
  '',
  'module',
  'text/javascript',
  'application/javascript',
]);

/** CSP hash sources for every inline script the browser would run. */
function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    const type = /\btype="([^"]*)"/.exec(match[1])?.[1] ?? '';
    if (!EXECUTABLE_SCRIPT_TYPES.has(type)) continue;
    const digest = new Bun.CryptoHasher('sha256').update(match[2]).digest('base64');
    hashes.push(`'sha256-${digest}'`);
  }
  return hashes;
}

function readCatchAllCsp(app: string): string {
  const rules = parseHeadersFile(readFileSync(join(app, 'public/_headers'), 'utf8'));
  return rules.get('/*')?.get('content-security-policy') ?? '';
}

describe('static site _headers helpers', () => {
  it('ignores JSON-LD blocks and hashes runnable inline scripts', () => {
    const html =
      '<script type="application/ld+json">{}</script><script>a()</script><script src="/x.js"></script>';
    const expected = new Bun.CryptoHasher('sha256').update('a()').digest('base64');

    expect(inlineScriptHashes(html)).toEqual([`'sha256-${expected}'`]);
  });

  it('reads directives from a CSP string', () => {
    expect(cspDirective("default-src 'self'; script-src 'self' x.com", 'script-src')).toEqual([
      "'self'",
      'x.com',
    ]);
  });
});

for (const app of STATIC_APPS) {
  describe(`${app}/public/_headers`, () => {
    const rules = parseHeadersFile(readFileSync(join(app, 'public/_headers'), 'utf8'));
    const catchAll = rules.get('/*');
    const csp = catchAll?.get('content-security-policy') ?? '';

    it('sets the security headers on every path with one /* block', () => {
      expect(catchAll?.get('x-content-type-options')).toBe('nosniff');
      expect(catchAll?.get('x-frame-options')).toBe('DENY');
      expect(catchAll?.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      for (const [pattern, headers] of rules) {
        if (pattern !== '/*') expect(headers.has('content-security-policy')).toBe(false);
      }
    });

    it('keeps a strict CSP', () => {
      expect(cspDirective(csp, 'default-src')).toEqual(["'self'"]);
      expect(cspDirective(csp, 'frame-ancestors')).toEqual(["'none'"]);
      expect(cspDirective(csp, 'object-src')).toEqual(["'none'"]);
      expect(cspDirective(csp, 'base-uri')).toEqual(["'self'"]);
      expect(cspDirective(csp, 'script-src')).toContain("'self'");
      expect(cspDirective(csp, 'script-src')).not.toContain("'unsafe-inline'");
      expect(cspDirective(csp, 'script-src')).not.toContain("'unsafe-eval'");
    });
  });
}

// Needs a fresh build, so CI names the apps it just built: CHECK_STATIC_BUILD=apps/docs,apps/site
const builtApps = (process.env.CHECK_STATIC_BUILD ?? '').split(',').filter(Boolean);

describe.skipIf(builtApps.length === 0)('built static sites', () => {
  it('CHECK_STATIC_BUILD names only known static apps', () => {
    for (const app of builtApps) expect(STATIC_APPS as readonly string[]).toContain(app);
  });

  for (const app of STATIC_APPS.filter((name) => builtApps.includes(name))) {
    it(`${app}: the CSP allows every inline script in dist`, () => {
      const dist = join(app, 'dist');
      expect(existsSync(join(dist, '_headers'))).toBe(true);

      const allowed = new Set(cspDirective(readCatchAllCsp(app), 'script-src'));
      const missing = new Set<string>();
      for (const file of new Bun.Glob('**/*.html').scanSync(dist)) {
        for (const hash of inlineScriptHashes(readFileSync(join(dist, file), 'utf8'))) {
          if (!allowed.has(hash)) missing.add(`${file} ${hash}`);
        }
      }

      expect([...missing]).toEqual([]);
    });
  }
});
