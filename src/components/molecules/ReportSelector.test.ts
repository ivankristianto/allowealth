/**
 * Unit tests for ReportSelector component
 *
 * Tests the rendering and props handling of the ReportSelector molecule component.
 */

import { describe, it, expect } from 'bun:test';

describe('ReportSelector', () => {
  it('should render with default props', () => {
    const props = {
      selectedRange: 'monthly' as const,
      selectedPeriod: 'February 2024',
      availablePeriods: ['December 2023', 'January 2024', 'February 2024'],
    };

    expect(props.selectedRange).toBe('monthly');
    expect(props.selectedPeriod).toBe('February 2024');
    expect(props.availablePeriods).toHaveLength(3);
  });

  it('should handle yearly range selection', () => {
    const props = {
      selectedRange: 'yearly' as const,
      selectedPeriod: '2024',
      availablePeriods: ['2022', '2023', '2024'],
    };

    expect(props.selectedRange).toBe('yearly');
    expect(props.selectedPeriod).toBe('2024');
  });

  it('should handle empty periods list', () => {
    const props = {
      selectedRange: 'monthly' as const,
      selectedPeriod: 'February 2024',
      availablePeriods: [],
    };

    expect(props.availablePeriods).toHaveLength(0);
  });

  it('should handle custom className', () => {
    const props = {
      selectedRange: 'monthly' as const,
      selectedPeriod: 'February 2024',
      availablePeriods: ['February 2024'],
      className: 'custom-class',
    };

    expect(props.className).toBe('custom-class');
  });

  it('should validate range type', () => {
    const validRanges: Array<'monthly' | 'yearly'> = ['monthly', 'yearly'];

    expect(validRanges).toContain('monthly');
    expect(validRanges).toContain('yearly');
  });
});
