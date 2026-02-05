import { describe, it, expect } from 'bun:test';
import { listCategoriesSchema, listAssetsSchema } from './assets';

describe('tool schemas', () => {
  it('should validate list_categories input', () => {
    expect(() => listCategoriesSchema.parse({})).not.toThrow();
    expect(() => listCategoriesSchema.parse({ type: 'expense' })).not.toThrow();
    expect(() => listCategoriesSchema.parse({ type: 'invalid' })).toThrow();
  });

  it('should validate list_assets input', () => {
    expect(() => listAssetsSchema.parse({})).not.toThrow();
  });
});
