import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const actionButtonFiles = [
  'src/components/molecules/TransactionEntryForm.astro',
  'src/components/molecules/ConfirmationModal.astro',
  'src/components/organisms/PaymentMethodFormModal.astro',
  'src/components/organisms/CategoryModal.astro',
  'src/components/organisms/AssetCategoryModal.astro',
  'src/components/organisms/AssetFormModal.astro',
  'src/components/organisms/AssetUpdateValueModal.astro',
  'src/components/organisms/InviteMemberModal.astro',
  'src/pages/settings/index.astro',
  'src/pages/budget/categories/index.astro',
];

const formControlFiles = [
  'src/components/atoms/Input.astro',
  'src/components/atoms/AssetSelect.astro',
  'src/components/atoms/CategorySelect.astro',
  'src/components/atoms/CurrencyInput.astro',
  'src/components/atoms/DatePicker.astro',
  'src/components/organisms/TransactionFiltersBar.astro',
];

function read(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

describe('UI style consistency', () => {
  it('uses rounded-2xl for actionable buttons', () => {
    for (const filePath of actionButtonFiles) {
      const source = read(filePath);
      expect(source.includes('rounded-full')).toBe(false);
      expect(source.includes('rounded-2xl')).toBe(true);
    }
  });

  it('uses rounded-lg for form controls without border-0', () => {
    for (const filePath of formControlFiles) {
      const source = read(filePath);
      expect(source.includes('rounded-full')).toBe(false);
      expect(source.includes('border-0')).toBe(false);
      expect(source.includes('rounded-lg')).toBe(true);
    }
  });

  it('avoids low-contrast button border opacity classes', () => {
    const flagged = [
      'border-accent/10',
      'border-accent/20',
      'hover:border-accent/30',
      'hover:border-base-content/30',
    ];

    for (const filePath of actionButtonFiles) {
      const source = read(filePath);
      flagged.forEach((pattern) => {
        expect(source.includes(pattern)).toBe(false);
      });
    }
  });
});
