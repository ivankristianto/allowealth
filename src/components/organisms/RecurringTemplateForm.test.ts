import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readRecurringTemplateForm(): string {
  return readFileSync('src/components/organisms/RecurringTemplateForm.astro', 'utf-8');
}

describe('RecurringTemplateForm drawer UX structure', () => {
  it('uses drawer native header title for parity with transaction drawer', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('<Drawer id="recurring-template-drawer" title="New Recurring"');
  });

  it('uses explicit aligned field blocks for category and account', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-category-block');
    expect(source).toContain('data-recurring-account-block');
  });

  it('uses consolidated rules card for end condition and installment', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-rules-card');
    expect(source).toContain('data-recurring-end-group');
    expect(source).toContain('data-recurring-installment-group');
  });

  it('shows installment disabled guidance marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-installment-disabled-hint');
  });

  it('keeps description collapsed by default with explicit summary marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-description-details');
    expect(source).toContain('data-recurring-description-summary');
  });

  it('uses segmented type control marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-type-segmented');
  });

  it('uses emphasized amount field marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-amount-field');
  });

  it('uses sticky action footer marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-actions');
  });
});
