import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import {
  createAccountCategoryAPISchema,
  createAccountCategorySchema,
  updateAccountCategorySchema,
} from './account-categories';

describe('account category validation', () => {
  it('applies defaults for service-layer account category creation', () => {
    const parsed = parse(createAccountCategorySchema, {
      workspace_id: 'workspace-1',
      created_by_user_id: 'user-1',
      name: 'Cash',
      is_liability: false,
    });

    expect(parsed).toEqual({
      workspace_id: 'workspace-1',
      created_by_user_id: 'user-1',
      name: 'Cash',
      description: null,
      is_liability: false,
      is_system: false,
      sort_order: 0,
    });
  });

  it('rejects an empty API name', () => {
    expect(() =>
      parse(createAccountCategoryAPISchema, {
        name: '',
        description: null,
        isLiability: false,
      })
    ).toThrow();
  });

  it('normalizes empty descriptions to null in updates', () => {
    const parsed = parse(updateAccountCategorySchema, {
      description: '',
    });

    expect(parsed.description).toBeNull();
  });
});
