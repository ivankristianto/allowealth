import { describe, it } from 'bun:test';
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
  'src/components/partials/PaginationPartial.astro',
  'src/pages/settings/index.astro',
  'src/pages/budget/categories/index.astro',
  'src/pages/transactions/index.astro',
];

const formControlFiles = [
  'src/components/atoms/Input.astro',
  'src/components/atoms/AssetSelect.astro',
  'src/components/atoms/CategorySelect.astro',
  'src/components/atoms/CurrencyInput.astro',
  'src/components/atoms/DatePicker.astro',
  'src/components/molecules/LoginForm.astro',
  'src/components/molecules/RegistrationForm.astro',
  'src/components/molecules/PasswordChangeForm.astro',
  'src/components/organisms/InviteMemberModal.astro',
  'src/components/organisms/TransactionFiltersBar.astro',
  'src/pages/settings/index.astro',
];

function read(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

function getTagSegments(
  source: string,
  tagName: 'button' | 'Button' | 'input' | 'select' | 'textarea'
) {
  const pattern = new RegExp(`<${tagName}\\b[\\s\\S]*?>`, 'g');
  return source.match(pattern) ?? [];
}

function getActionableButtonSegments(source: string): string[] {
  return [...getTagSegments(source, 'button'), ...getTagSegments(source, 'Button')];
}

function getFormControlSegments(source: string): string[] {
  return [
    ...getTagSegments(source, 'input'),
    ...getTagSegments(source, 'select'),
    ...getTagSegments(source, 'textarea'),
  ];
}

describe('UI style consistency', () => {
  it('uses rounded-2xl for actionable buttons', () => {
    for (const filePath of actionButtonFiles) {
      const source = read(filePath);
      const buttonSegments = getActionableButtonSegments(source);

      if (buttonSegments.length === 0) {
        throw new Error(`[${filePath}] expected at least one actionable button segment`);
      }

      // Chip/pill buttons (role="radio", data-category-chip, data-category-toggle) legitimately use rounded-full
      const actionButtons = buttonSegments.filter(
        (seg) =>
          !seg.includes('role="radio"') &&
          !seg.includes('data-category-chip') &&
          !seg.includes('data-category-toggle')
      );
      const hasRoundedFullButton = actionButtons.some((segment) =>
        segment.includes('rounded-full')
      );
      if (hasRoundedFullButton) {
        throw new Error(`[${filePath}] found rounded-full on actionable button segment`);
      }

      const hasRounded2xlButton = buttonSegments.some((segment) => segment.includes('rounded-2xl'));
      if (!hasRounded2xlButton) {
        throw new Error(
          `[${filePath}] expected rounded-2xl on at least one actionable button segment`
        );
      }
    }
  });

  it('uses rounded-lg for form controls without border-0', () => {
    for (const filePath of formControlFiles) {
      const source = read(filePath);
      const controlSegments = getFormControlSegments(source);

      const hasRoundedFullControl = controlSegments.some((segment) =>
        segment.includes('rounded-full')
      );
      const hasRoundedFullControlPattern =
        /(?:input|select|textarea)[^"'`\n]*rounded-full|rounded-full[^"'`\n]*(?:input|select|textarea)/.test(
          source
        );

      if (hasRoundedFullControl || hasRoundedFullControlPattern) {
        throw new Error(`[${filePath}] found rounded-full on form control segment`);
      }

      const hasBorderZeroControl = controlSegments.some((segment) => segment.includes('border-0'));
      const hasBorderZeroControlPattern =
        /(?:input|select|textarea)[^"'`\n]*border-0|border-0[^"'`\n]*(?:input|select|textarea)/.test(
          source
        );

      if (hasBorderZeroControl || hasBorderZeroControlPattern) {
        throw new Error(`[${filePath}] found border-0 on form control segment`);
      }

      const hasSupportedRoundedControl = controlSegments.some(
        (segment) =>
          segment.includes('rounded-lg') ||
          segment.includes('rounded-l-lg') ||
          segment.includes('rounded-r-lg')
      );
      const hasSupportedRoundedControlPattern =
        source.includes('rounded-lg') ||
        source.includes('rounded-l-lg') ||
        source.includes('rounded-r-lg');

      if (!hasSupportedRoundedControl && !hasSupportedRoundedControlPattern) {
        throw new Error(
          `[${filePath}] expected rounded-lg/rounded-l-lg/rounded-r-lg on at least one form control segment`
        );
      }
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
      const buttonSegments = getActionableButtonSegments(source);
      flagged.forEach((pattern) => {
        const hasPattern = buttonSegments.some((segment) => segment.includes(pattern));
        if (hasPattern) {
          throw new Error(`[${filePath}] found low-contrast button border class: ${pattern}`);
        }
      });
    }
  });
});
