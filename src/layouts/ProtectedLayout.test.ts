import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ProtectedLayout workspace name', () => {
  const source = readFileSync('src/layouts/ProtectedLayout.astro', 'utf8');

  it('includes workspaceName in cached layout data', () => {
    expect(source).toContain('workspaceName: string;');
    expect(source).toContain('workspaceService.findById(user.workspaceId)');
    expect(source).toContain('workspaceName = cached.workspaceName ?? workspaceName;');
  });

  it('passes workspaceName to MainLayout', () => {
    expect(source).toContain('workspaceName={workspaceName}');
  });
});
