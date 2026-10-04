/**
 * Guards against native form submissions leaking field values into URLs.
 *
 * A `<form>` without `method` submits as GET, and ClientRouter turns that into
 * a navigation to `?field=value`. That happens whenever the JS submit handler
 * is missing (soft navigation to a page whose script already ran, or a submit
 * before the script loaded), which put login credentials in the address bar.
 */
import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(import.meta.dir, '..');

const readSources = (pattern: string) =>
  Array.from(new Glob(pattern).scanSync({ cwd: SRC_DIR }))
    .filter((file) => !file.endsWith('.test.ts'))
    .map((file) => ({ file, source: readFileSync(join(SRC_DIR, file), 'utf8') }));

describe('form submission safety', () => {
  it('declares an explicit method on every <form>', () => {
    const formsWithoutMethod = readSources('**/*.astro').flatMap(({ file, source }) =>
      Array.from(source.matchAll(/<form\b([^>]*)>/g))
        .filter(([, attributes]) => !/\bmethod=/.test(attributes ?? ''))
        .map(({ index }) => `${file}:${source.slice(0, index).split('\n').length}`)
    );

    expect(formsWithoutMethod).toEqual([]);
  });

  it('re-binds submit handlers after ClientRouter soft navigations', () => {
    const submitListener = /addEventListener\(\s*['"]submit['"]|^\s*['"]submit['"],\s*$/m;
    const reinitialized = /onPageReady\(|astro:page-load/;

    const bindOnlyOnce = readSources('**/*.{astro,ts}')
      .filter(({ source }) => submitListener.test(source) && !reinitialized.test(source))
      .map(({ file }) => file);

    expect(bindOnlyOnce).toEqual([]);
  });
});
