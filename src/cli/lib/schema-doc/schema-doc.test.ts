import { describe, expect, it } from 'bun:test';
import * as schema from '@/db/schema/sqlite';
import * as userMfa from '@/db/schema/sqlite/user-mfa';
import * as userMfaBackupCodes from '@/db/schema/sqlite/user-mfa-backup-codes';
import { generateSchemaDoc } from './index';
import { collectTables, findGroupingProblems, renderReference } from './reference';

const tables = collectTables([schema, userMfa, userMfaBackupCodes]);

describe('schema doc', () => {
  it('places every schema table in exactly one reference group', () => {
    // Fails when a table is added or renamed without updating TABLE_GROUPS in reference.ts.
    expect(findGroupingProblems(tables.keys())).toEqual({
      ungrouped: [],
      unknown: [],
      duplicated: [],
    });
  });

  it('reports ungrouped, unknown and duplicated tables', () => {
    const problems = findGroupingProblems(
      ['a', 'b'],
      [
        { title: 'One', note: '', tables: ['a', 'ghost'] },
        { title: 'Two', note: '', tables: ['a'] },
      ]
    );
    expect(problems).toEqual({ ungrouped: ['b'], unknown: ['ghost'], duplicated: ['a'] });
  });

  it('renders money columns as decimal text and foreign keys with their delete rule', () => {
    const html = renderReference(tables, [{ title: 'Ledger', note: '', tables: ['transactions'] }]);
    expect(html).toContain('<td class="c-type c-money">decimal as text</td>');
    expect(html).toContain('→ workspaces · cascade');
    expect(html).toContain('expense | income | transfer');
  });

  it('fills every template placeholder', () => {
    const html = generateSchemaDoc(new Date('2026-10-04T00:00:00Z'));
    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(html).toContain('<title>Allowealth Data Model</title>');
    expect(html).toContain('4 October 2026');
    expect(html.match(/<svg class="diagram"/g)).toHaveLength(3);
  });
});
