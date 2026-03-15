import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('security activity card composition', () => {
  test('extracts recent user activities into a dedicated component', () => {
    const pageSource = readFileSync('src/pages/security.astro', 'utf8');

    expect(pageSource).toContain('import SecurityRecentUserActivitiesCard');
    expect(pageSource).toContain('<SecurityRecentUserActivitiesCard');
    expect(pageSource).not.toContain('Recent Security Events');
  });
});
