import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readRecurringPage(): string {
  return readFileSync('src/pages/recurring/index.astro', 'utf8');
}

function readRecurringDocs(): string {
  return readFileSync('apps/docs/src/content/docs/end-users/recurring.md', 'utf8');
}

describe('recurring copy consistency', () => {
  it('describes the recurring dashboard without monthly-only wording', () => {
    const page = readRecurringPage();

    expect(page).toContain('Schedule summary of recurring income and expenses with quick actions.');
    expect(page).toContain('Review and manage your recurring transactions across any schedule.');
    expect(page).toContain('Upcoming recurring income and expenses, sorted by scheduled date.');
    expect(page).toContain('Confirm occurrences or view them on calendar.');
  });

  it('documents schedule presets and the no-end default', () => {
    const docs = readRecurringDocs();

    expect(docs).toContain(
      '- **Schedule** - Set how often it repeats with presets such as Weekly, Monthly, Quarterly, Semi-annual, or Annual'
    );
    expect(docs).toContain(
      '- **End** - Leave it on No end for ongoing bills, subscriptions, or salary'
    );
    expect(docs).toContain('1. Confirm completed or received occurrences');
    expect(docs).toContain('If the same occurrence appears twice:');
    expect(docs).toContain('For variable recurring amounts:');
    expect(docs).toContain(
      '- **Dashboard** - Upcoming recurring activity appears in the Cash Flow widget'
    );
  });
});
