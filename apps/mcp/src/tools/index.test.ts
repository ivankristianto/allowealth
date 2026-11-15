import { describe, expect, test } from 'bun:test';
import { registerTools, toolAnnotations } from './index.js';

describe('toolAnnotations', () => {
  test('marks a tool read-only when every permission is a read', () => {
    expect(toolAnnotations(['accounts:read', 'budgets:read'])).toEqual({ readOnlyHint: true });
  });

  test('marks a tool destructive when any permission is a delete', () => {
    expect(toolAnnotations(['transactions:read', 'transactions:delete'])).toEqual({
      destructiveHint: true,
    });
  });

  test('sets neither hint for other writes', () => {
    expect(toolAnnotations(['transactions:create'])).toEqual({});
    expect(toolAnnotations(['transactions:read', 'transactions:update'])).toEqual({});
  });
});

describe('registered tool annotations', () => {
  test('each tool carries the hints its permissions imply', () => {
    const annotations = Object.fromEntries(
      registerTools().map((tool) => [tool.name, tool.annotations])
    );

    expect(annotations).toEqual({
      list_categories: { readOnlyHint: true },
      list_accounts: { readOnlyHint: true },
      list_transactions: { readOnlyHint: true },
      add_expense: {},
      add_income: {},
      get_budget_summary: { readOnlyHint: true },
      get_dashboard: { readOnlyHint: true },
      get_account_summary: { readOnlyHint: true },
    });
  });
});
