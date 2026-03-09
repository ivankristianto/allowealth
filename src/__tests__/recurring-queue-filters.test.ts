import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('recurring queue filters', () => {
  it('renders queue pills as toggle buttons and tags queue items by type', () => {
    const list = read('src/components/organisms/RecurringPendingList.astro');
    const card = read('src/components/molecules/RecurringPendingCard.astro');

    expect(list).toContain('data-pending-filter="income"');
    expect(list).toContain('data-pending-filter="expense"');
    expect(list).toContain('data-occurrence-type={occurrence.templateType}');
    expect(card).toContain('data-occurrence-type={occurrence.templateType}');
  });

  it('reapplies the pending filter after queue refreshes', () => {
    const client = read('src/components/organisms/RecurringPage.client.ts');

    expect(client).toContain("let pendingTypeFilter: 'all' | 'income' | 'expense' = 'all';");
    expect(client).toContain('function applyPendingQueueFilter()');
    expect(client).toContain('applyPendingQueueFilter();');
  });
});
