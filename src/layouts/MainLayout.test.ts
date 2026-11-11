import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('MainLayout workspace name forwarding', () => {
  it('accepts workspaceName and forwards it to BaseLayout', () => {
    const source = readFileSync('src/layouts/MainLayout.astro', 'utf8');

    expect(source).toContain('workspaceName?: string;');
    expect(source).toContain(
      '<BaseLayout title={title} ssrTheme={ssrTheme} workspaceName={workspaceName}>'
    );
  });
});
