import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readRecurringPage(): string {
  return readFileSync('src/pages/recurring/index.astro', 'utf8');
}

function readRecurringDocs(): string {
  return readFileSync('docs/sites/src/content/docs/end-users/recurring.md', 'utf8');
}

describe('recurring copy consistency', () => {
  it('describes the recurring dashboard without monthly-only wording', () => {
    const page = readRecurringPage();

    expect(page).toContain('Schedule summary of recurring income and expenses with quick actions.');
    expect(page).toContain('Review and manage your recurring transactions across any schedule.');
  });

  it('documents the same preset options shown in the recurring template form', () => {
    const docs = readRecurringDocs();

    expect(docs).toContain(
      '- **Frequency** - How often it repeats. Choose a preset (Weekly, Monthly, Quarterly, Semi-annual, Annual) or set a custom interval such as biweekly'
    );
  });
});
