import { describe, it, expect } from 'bun:test';
import { listCategoriesSchema, listAccountsSchema } from './accounts';

describe('tool schemas', () => {
  it('should validate list_categories input', () => {
    expect(() => listCategoriesSchema.parse({})).not.toThrow();
    expect(() => listCategoriesSchema.parse({ type: 'expense' })).not.toThrow();
    expect(() => listCategoriesSchema.parse({ type: 'invalid' })).toThrow();
  });

  it('should validate list_accounts input', () => {
    expect(() => listAccountsSchema.parse({})).not.toThrow();
  });
});
