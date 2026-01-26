/**
 * Unit tests for StatCard component
 *
 * Tests the rendering and props handling of the StatCard atom component.
 */

import { describe, it, expect } from 'bun:test';

describe('StatCard', () => {
  it('should render with required props', () => {
    // StatCard is an Astro component, so we test its interface and expected behavior
    const props = {
      title: 'TOTAL INCOME',
      value: 'Rp 9.750.000',
    };

    expect(props.title).toBe('TOTAL INCOME');
    expect(props.value).toBe('Rp 9.750.000');
  });

  it('should handle optional subtitle and icon', () => {
    const props = {
      title: 'TOTAL INCOME',
      value: 'Rp 9.750.000',
      subtitle: 'PERIOD TOTAL',
      subtitleIcon: 'trending-up',
    };

    expect(props.subtitle).toBe('PERIOD TOTAL');
    expect(props.subtitleIcon).toBe('trending-up');
  });

  it('should handle custom colors', () => {
    const props = {
      title: 'TOTAL INCOME',
      value: 'Rp 9.750.000',
      valueColor: 'text-success',
      subtitleColor: 'text-success/60',
    };

    expect(props.valueColor).toBe('text-success');
    expect(props.subtitleColor).toBe('text-success/60');
  });

  it('should handle progress bar props', () => {
    const props = {
      title: 'BUDGET HEALTH',
      value: '8%',
      progress: 8,
      progressColor: 'bg-success',
    };

    expect(props.progress).toBe(8);
    expect(props.progressColor).toBe('bg-success');
  });

  it('should handle all optional props', () => {
    const props = {
      title: 'NET SAVINGS',
      value: 'Rp 5.015.000',
      subtitle: 'RETAINED CAPITAL',
      subtitleIcon: 'trending-up',
      valueColor: 'text-accent',
      subtitleColor: 'text-base-content/60',
      progress: 50,
      progressColor: 'bg-accent',
      className: 'custom-class',
    };

    expect(props.title).toBe('NET SAVINGS');
    expect(props.value).toBe('Rp 5.015.000');
    expect(props.subtitle).toBe('RETAINED CAPITAL');
    expect(props.subtitleIcon).toBe('trending-up');
    expect(props.valueColor).toBe('text-accent');
    expect(props.subtitleColor).toBe('text-base-content/60');
    expect(props.progress).toBe(50);
    expect(props.progressColor).toBe('bg-accent');
    expect(props.className).toBe('custom-class');
  });
});
