import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readLimitFields, syncCategoryLimit } from './AppPasswordLimitFields.client';

function formData(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe('readLimitFields', () => {
  test('sends an empty object when no limit is ticked, so saving clears them', () => {
    expect(readLimitFields(formData([['category_ids', 'cat_a']]))).toEqual({ limits: {} });
  });

  test('sends the ticked categories and the own transactions limit', () => {
    expect(
      readLimitFields(
        formData([
          ['limit_categories', 'on'],
          ['category_ids', 'cat_a'],
          ['category_ids', 'cat_b'],
          ['own_transactions_only', 'on'],
        ])
      )
    ).toEqual({ limits: { category_ids: ['cat_a', 'cat_b'], own_transactions_only: true } });
  });

  test('sends an empty category list as is, so the server asks for one', () => {
    expect(readLimitFields(formData([['limit_categories', 'on']]))).toEqual({
      limits: { category_ids: [] },
    });
  });
});

function limitForm(categoryLimitOn: boolean): HTMLFormElement {
  const document = new Window().document;
  const form = document.createElement('form');
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = categoryLimitOn;
  toggle.setAttribute('data-app-password-category-limit', '');
  const picker = document.createElement('fieldset');
  picker.setAttribute('data-app-password-limit-categories', '');
  picker.hidden = !categoryLimitOn;
  picker.disabled = !categoryLimitOn;
  form.append(toggle, picker);
  return form as unknown as HTMLFormElement;
}

describe('syncCategoryLimit', () => {
  test('shows and enables the category picker only while the limit is ticked', () => {
    const form = limitForm(false);
    const toggle = form.querySelector<HTMLInputElement>('[data-app-password-category-limit]')!;
    const picker = form.querySelector<HTMLFieldSetElement>('[data-app-password-limit-categories]')!;

    toggle.checked = true;
    syncCategoryLimit(form);
    expect([picker.hidden, picker.disabled]).toEqual([false, false]);

    toggle.checked = false;
    syncCategoryLimit(form);
    expect([picker.hidden, picker.disabled]).toEqual([true, true]);
  });
});
