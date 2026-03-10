import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import { createCategoryAPISchema, createCategorySchema, updateCategorySchema } from './categories';

describe('category validation', () => {
  it('applies defaults for API category creation', () => {
    const parsed = parse(createCategoryAPISchema, {
      name: 'Salary',
      type: 'income',
    });

    expect(parsed).toEqual({
      name: 'Salary',
      type: 'income',
      income_source_type: 'other',
      description: null,
      icon: 'tag',
      color: 'bg-neutral',
    });
  });

  it('rejects an empty category name', () => {
    expect(() =>
      parse(createCategorySchema, {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        name: '',
        type: 'expense',
      })
    ).toThrow();
  });

  it('rejects invalid category types', () => {
    expect(() =>
      parse(createCategoryAPISchema, {
        name: 'Salary',
        type: 'refund',
      })
    ).toThrow();
  });

  it('allows nullable descriptions and optional fields on update', () => {
    const parsed = parse(updateCategorySchema, {
      description: '',
      is_active: false,
    });

    expect(parsed.description).toBeNull();
    expect(parsed.is_active).toBe(false);
  });
});
