import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_ACCOUNT_CATEGORIES,
  DEFAULT_CATEGORY_NAME_BY_TYPE,
  DEFAULT_TYPE_BY_CATEGORY_NAME,
} from './account-categories';

describe('default account category lookups', () => {
  it("maps the 'other' type to the 'Other' category, not a later category sharing the type", () => {
    expect(DEFAULT_CATEGORY_NAME_BY_TYPE.get('other')).toBe('Other');
  });

  it('maps every type to the first default category that declares it', () => {
    for (const [type, name] of DEFAULT_CATEGORY_NAME_BY_TYPE) {
      expect(DEFAULT_ACCOUNT_CATEGORIES.find((c) => c.legacyType === type)?.name).toBe(name);
    }
  });

  it('maps each default category name back to its type', () => {
    expect(DEFAULT_TYPE_BY_CATEGORY_NAME.get('Commodities & Precious Metals')).toBe('other');
    expect(DEFAULT_TYPE_BY_CATEGORY_NAME.get('Bank Account')).toBe('bank_account');
  });
});
