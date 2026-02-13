import { describe, expect, it } from 'bun:test';
import {
  BUDGET_FILTER_MOBILE_SECOND_ROW_CLASS,
  BUDGET_FILTER_CONTROL_HEIGHT_CLASS,
} from './budget-filter-controls.config';

describe('BudgetFilterControls layout config', () => {
  it('uses a 70:30 split for mobile sort/view row', () => {
    expect(BUDGET_FILTER_MOBILE_SECOND_ROW_CLASS).toContain('grid-cols-[7fr_3fr]');
  });

  it('keeps control heights consistent in the combined control', () => {
    expect(BUDGET_FILTER_CONTROL_HEIGHT_CLASS).toContain('h-11');
    expect(BUDGET_FILTER_CONTROL_HEIGHT_CLASS).toContain('min-h-[44px]');
  });
});
