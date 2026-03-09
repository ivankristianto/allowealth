import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('recurring page UX', () => {
  it('uses a month-aware queue heading on the recurring page', () => {
    const page = read('src/pages/recurring/index.astro');
    const client = read('src/components/organisms/RecurringPage.client.ts');

    expect(page).toContain('const actionInboxTitle');
    expect(page).toContain("selectedMonthLabel.split(' ')[0]");
    expect(page).toContain('{actionInboxTitle}');
    expect(page).toContain('data-action-inbox-title');
    expect(client).toContain('function updateActionInboxTitle(');
    expect(client).toContain('const nextLabel = detail.label');
    expect(client).toContain('updateActionInboxTitle(nextLabel);');
  });

  it('uses month-aware due wording while framing income as expected', () => {
    const desktop = read('src/components/organisms/RecurringPendingList.astro');
    const mobile = read('src/components/molecules/RecurringPendingCard.astro');

    expect(desktop).toContain('formatRecurringFrequencyLabel(');
    expect(desktop).not.toContain(`: 'Recurring monthly'`);
    expect(desktop).toContain(`{isExpense ? 'Due' : 'Expected'} {dueLabel}`);
    expect(desktop).not.toContain('Available on {dueLabel}');
    expect(mobile).toContain('const dueBadgeLabel = isOverdue');
    expect(mobile).toContain(': isExpense');
    expect(mobile).toContain(': `Expected ${dueDateLabel}`;');
    expect(mobile).toContain(`{isExpense ? 'Due' : 'Expected'} {dueDateLabel}`);
    expect(mobile).not.toContain('Available on {dueDateLabel}');
  });
});
