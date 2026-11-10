/**
 * The production CSP allows scripts by nonce only, so browsers drop inline
 * `on*` handler attributes. Dev allows 'unsafe-inline', which hides the breakage.
 */
import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(import.meta.dir, '..', '..');

// Matches `onclick=` and `onClick=`, but not props such as `oneTimeTotal=`.
const INLINE_HANDLER = /\son(?:[a-z]+|[A-Z][a-zA-Z]+)\s*=/g;

// Blanks frontmatter and script/style bodies while keeping line numbers intact.
function markupOnly(source: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  return source
    .replace(/^---\n[\s\S]*?\n---/, blank)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, blank);
}

describe('inline event handlers', () => {
  it('never puts an on* handler attribute in .astro markup', () => {
    const offenders = Array.from(new Glob('**/*.astro').scanSync({ cwd: SRC_DIR })).flatMap(
      (file) => {
        const markup = markupOnly(readFileSync(join(SRC_DIR, file), 'utf8'));
        return Array.from(markup.matchAll(INLINE_HANDLER)).map(
          ({ index }) => `${file}:${markup.slice(0, index).split('\n').length}`
        );
      }
    );

    expect(offenders).toEqual([]);
  });
});
