import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('recurring template form client logic', () => {
  it('defaults new templates to no-end mode', () => {
    const client = read('src/components/organisms/RecurringTemplateForm.client.ts');

    expect(client).toContain('const endModeInputs = Array.from(');
    expect(client).toContain(`form.querySelectorAll<HTMLInputElement>('input[name="end_mode"]')`);
    expect(client).toContain(`setEndMode('none');`);
  });

  it('builds payloads without forcing an end condition', () => {
    const client = read('src/components/organisms/RecurringTemplateForm.client.ts');

    expect(client).not.toContain(`showError('At least one end condition is required.')`);
    expect(client).toContain(`if (selectedEndMode === 'count' && totalOccurrencesInput?.value)`);
    expect(client).toContain(`if (selectedEndMode === 'date' && endDateInput?.value)`);
    expect(client).toContain('payload.total_occurrences = null;');
    expect(client).toContain('payload.end_date = null;');
  });
});
