import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('MainLayout prop forwarding', () => {
  const source = readFileSync('src/layouts/MainLayout.astro', 'utf8');

  it('accepts workspaceName and forwards it to BaseLayout', () => {
    expect(source).toContain('workspaceName?: string;');
    expect(source).toContain('workspaceName={workspaceName}');
  });

  it('forwards the workspace timezone to BaseLayout, which exposes it on <body>', () => {
    expect(source).toContain('timeZone?: string;');
    expect(source).toMatch(/<BaseLayout[^>]*timeZone=\{timeZone\}/);
    expect(readFileSync('src/layouts/BaseLayout.astro', 'utf8')).toContain(
      '<body data-workspace-timezone={timeZone}>'
    );
  });
});
