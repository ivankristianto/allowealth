import { describe, expect, it } from 'bun:test';
import {
  MOBILE_BUDGET_ACTION_ORDER,
  shouldShowAiRebalancer,
  BUDGET_ACTIONS_MOBILE_SCROLL_CLASS,
} from './budget-actions.config';

describe('BudgetActions mobile configuration', () => {
  it('keeps the requested mobile-first action order', () => {
    expect(MOBILE_BUDGET_ACTION_ORDER).toEqual([
      'new-budget',
      'categories',
      'import',
      'export',
      'initialize-all',
      'ai-rebalancer',
    ]);
  });

  it('disables AI rebalancer even when the page asks to show it', () => {
    expect(shouldShowAiRebalancer(true)).toBe(false);
    expect(shouldShowAiRebalancer(false)).toBe(false);
  });

  it('uses horizontal-only scrolling affordances for mobile action row', () => {
    expect(BUDGET_ACTIONS_MOBILE_SCROLL_CLASS).toContain('overflow-x-auto');
    expect(BUDGET_ACTIONS_MOBILE_SCROLL_CLASS).toContain('overflow-y-hidden');
  });
});
