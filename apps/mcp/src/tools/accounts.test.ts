import { describe, it, expect } from 'bun:test';
import { parse } from 'valibot';
import { listCategoriesSchema, listAccountsSchema } from './accounts';

describe('tool schemas', () => {
  it('should validate list_categories input', () => {
    expect(() => parse(listCategoriesSchema, {})).not.toThrow();
    expect(() => parse(listCategoriesSchema, { type: 'expense' })).not.toThrow();
    expect(() => parse(listCategoriesSchema, { type: 'income' })).not.toThrow();
    expect(() => parse(listCategoriesSchema, { type: 'invalid' })).toThrow();
  });

  it('should validate list_accounts input', () => {
    expect(() => parse(listAccountsSchema, {})).not.toThrow();
  });
});
