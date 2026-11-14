/**
 * Browsers compile the `pattern` attribute with the `v` flag, where an unescaped
 * `-` in a character class is a syntax error and the constraint is silently dropped.
 */
import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as patterns from '@/lib/validation/patterns';

const SRC_DIR = join(import.meta.dir, '..', '..');

const compilesAsHtmlPattern = (source: string): boolean => {
  try {
    new RegExp(`^(?:${source})$`, 'v');
    return true;
  } catch {
    return false;
  }
};

const collectHtmlPatterns = (value: unknown, path: string): Array<[string, string]> => {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === 'html' && typeof child === 'string'
      ? [[`${path}.html`, child] as [string, string]]
      : collectHtmlPatterns(child, `${path}.${key}`)
  );
};

describe('HTML pattern attributes', () => {
  it('compiles every shared pattern with the v flag', () => {
    const { patterns: _aggregate, ...namedExports } = patterns;
    const invalid = collectHtmlPatterns(namedExports, 'patterns').filter(
      ([, source]) => !compilesAsHtmlPattern(source)
    );

    expect(invalid).toEqual([]);
  });

  it('compiles every literal pattern in components and scripts with the v flag', () => {
    const literal = /(?:\bpattern=|\.pattern\s*=\s*)(["'])((?:\\.|(?!\1).)*)\1/g;

    const invalid = Array.from(new Glob('**/*.{astro,ts}').scanSync({ cwd: SRC_DIR }))
      .filter((file) => !file.endsWith('.test.ts'))
      .flatMap((file) => {
        const source = readFileSync(join(SRC_DIR, file), 'utf8');
        return Array.from(source.matchAll(literal))
          .filter(([, quote, body]) => {
            const value =
              file.endsWith('.ts') || quote === "'" ? body!.replace(/\\\\/g, '\\') : body!;
            return !compilesAsHtmlPattern(value);
          })
          .map(({ index }) => `${file}:${source.slice(0, index).split('\n').length}`);
      });

    expect(invalid).toEqual([]);
  });
});
