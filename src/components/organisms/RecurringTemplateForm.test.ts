import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readRecurringTemplateForm(): string {
  return readFileSync('src/components/organisms/RecurringTemplateForm.astro', 'utf-8');
}

describe('RecurringTemplateForm drawer UX structure', () => {
  it('shows installment disabled guidance marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-installment-disabled-hint');
  });

  it('keeps description collapsed by default with explicit summary marker', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-description-details');
    expect(source).toContain('data-recurring-description-summary');
  });

  it('uses a merged schedule control', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-recurring-schedule-block');
    expect(source).toMatch(/>\s*Schedule\s*</);
    expect(source).not.toContain('>Frequency<');
    expect(source).not.toContain('>Cycle<');
    expect(source).not.toContain('>Repeat<');
    expect(source).toContain('name="frequency"');
    expect(source).toContain('name="interval_count"');
    expect(source).toContain('aria-label="Frequency"');
  });

  it('uses a no-end default end mode without required or optional badges', () => {
    const source = readRecurringTemplateForm();
    expect(source).toContain('data-end-mode="none"');
    expect(source).toContain('No end');
    expect(source).not.toContain('>Required<');
    expect(source).not.toContain('>Optional<');
  });
});
