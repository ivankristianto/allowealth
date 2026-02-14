import { describe, expect, it } from 'bun:test';
import {
  BUDGET_FILTER_MOBILE_SECOND_ROW_CLASS,
  BUDGET_FILTER_CONTROL_HEIGHT_CLASS,
  BUDGET_FILTER_DESKTOP_LAYOUT_CLASS,
} from './budget-filter-controls.config';

describe('BudgetFilterControls layout config', () => {
  it('uses a 70:30 split for mobile sort/view row', () => {
    expect(BUDGET_FILTER_MOBILE_SECOND_ROW_CLASS).toContain('grid-cols-[7fr_3fr]');
  });

  it('keeps control heights consistent in the combined control', () => {
    expect(BUDGET_FILTER_CONTROL_HEIGHT_CLASS).toContain('h-11');
    expect(BUDGET_FILTER_CONTROL_HEIGHT_CLASS).toContain('min-h-[44px]');
  });

  it('uses single-row layout on desktop breakpoints', () => {
    expect(BUDGET_FILTER_DESKTOP_LAYOUT_CLASS).toContain('md:flex');
    expect(BUDGET_FILTER_DESKTOP_LAYOUT_CLASS).toContain('md:space-y-0');
  });
});
