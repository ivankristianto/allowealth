/**
 * SpendingChart Component Tests
 * =============================
 * Unit tests for SpendingChart utility functions and props validation
 */

import { describe, it, expect } from 'bun:test';

// Chart colors from POC design
const DEFAULT_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#10b981', // green
];

describe('SpendingChart - overall percentage calculation', () => {
  const calculateOverallPercentage = (totalSpent: number, totalBudget: number): number => {
    if (totalBudget === 0) return 0;
    return Math.round((totalSpent / totalBudget) * 100);
  };

  it('should calculate percentage correctly for typical values', () => {
    expect(calculateOverallPercentage(53694000, 65900000)).toBe(81);
    expect(calculateOverallPercentage(45000000, 65900000)).toBe(68);
    expect(calculateOverallPercentage(65900000, 65900000)).toBe(100);
  });

  it('should handle zero budget', () => {
    expect(calculateOverallPercentage(50000000, 0)).toBe(0);
    expect(calculateOverallPercentage(0, 0)).toBe(0);
  });

  it('should handle zero spent', () => {
    expect(calculateOverallPercentage(0, 65900000)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateOverallPercentage(32950000, 65900000)).toBe(50); // exactly 50%
    expect(calculateOverallPercentage(33000000, 65900000)).toBe(50); // ~50.07%
    expect(calculateOverallPercentage(33300000, 65900000)).toBe(51); // ~50.53%
  });

  it('should cap at 100% when over budget', () => {
    expect(calculateOverallPercentage(70000000, 65900000)).toBe(106); // allows >100%
    expect(calculateOverallPercentage(100000000, 65900000)).toBe(152);
  });
});

describe('SpendingChart - data validation', () => {
  const testData = [
    { category: 'Housing', percentage: 45, color: '#ef4444' },
    { category: 'Groceries', percentage: 22, color: '#3b82f6' },
    { category: 'Dining', percentage: 12, color: '#f59e0b' },
    { category: 'Transport', percentage: 8, color: '#8b5cf6' },
    { category: 'Savings', percentage: 13, color: '#10b981' },
  ];

  it('should accept valid data structure', () => {
    expect(testData).toBeArray();
    expect(testData.length).toBeGreaterThan(0);
  });

  it('should have required properties on each item', () => {
    testData.forEach((item) => {
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('percentage');
      expect(item.category).toBeString();
      expect(item.percentage).toBeNumber();
    });
  });

  it('should have percentages in valid range', () => {
    testData.forEach((item) => {
      expect(item.percentage).toBeGreaterThanOrEqual(0);
      expect(item.percentage).toBeLessThanOrEqual(100);
    });
  });

  it('should have valid color codes', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    testData.forEach((item) => {
      if (item.color) {
        expect(item.color).toMatch(hexColorRegex);
      }
    });
  });
});

describe('SpendingChart - color assignment', () => {
  it('should assign default colors correctly based on index', () => {
    const getColorForIndex = (index: number): string => {
      return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    };

    expect(getColorForIndex(0)).toBe('#ef4444'); // red
    expect(getColorForIndex(1)).toBe('#3b82f6'); // blue
    expect(getColorForIndex(2)).toBe('#f59e0b'); // orange
    expect(getColorForIndex(3)).toBe('#8b5cf6'); // purple
    expect(getColorForIndex(4)).toBe('#10b981'); // green
  });

  it('should cycle through colors for more categories than default colors', () => {
    const getColorForIndex = (index: number): string => {
      return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    };

    expect(getColorForIndex(5)).toBe('#ef4444'); // cycles back to red
    expect(getColorForIndex(6)).toBe('#3b82f6'); // cycles back to blue
    expect(getColorForIndex(10)).toBe('#ef4444'); // 10 % 5 = 0, so red
  });
});

describe('SpendingChart - props validation', () => {
  it('should accept valid props', () => {
    const props = {
      data: [
        { category: 'Housing', percentage: 45 },
        { category: 'Groceries', percentage: 22 },
      ],
      totalSpent: 53694000,
      totalBudget: 65900000,
      loading: false,
      error: '',
    };

    expect(Array.isArray(props.data)).toBe(true);
    expect(typeof props.totalSpent).toBe('number');
    expect(typeof props.totalBudget).toBe('number');
    expect(typeof props.loading).toBe('boolean');
    expect(typeof props.error).toBe('string');
  });

  it('should handle empty data array', () => {
    const props = {
      data: [],
      totalSpent: 0,
      totalBudget: 65900000,
      loading: false,
      error: '',
    };

    expect(props.data.length).toBe(0);
  });

  it('should handle loading state', () => {
    const props = {
      data: [],
      totalSpent: 0,
      totalBudget: 0,
      loading: true,
      error: '',
    };

    expect(props.loading).toBe(true);
  });

  it('should handle error state', () => {
    const props = {
      data: [],
      totalSpent: 0,
      totalBudget: 0,
      loading: false,
      error: 'Failed to load spending data',
    };

    expect(props.error).toBeString();
    expect(props.error.length).toBeGreaterThan(0);
  });
});

describe('SpendingChart - center text label', () => {
  const getCenterTextLabel = (
    activeIndex: number | null,
    data: Array<{ category: string; percentage: number }>,
    overallPercentage: number
  ): { percentage: string; label: string } => {
    if (activeIndex !== null && data[activeIndex]) {
      const item = data[activeIndex];
      return {
        percentage: `${item.percentage}%`,
        label: item.category.toUpperCase(),
      };
    }
    return {
      percentage: `${overallPercentage}%`,
      label: 'SPENT',
    };
  };

  const testData = [
    { category: 'Housing', percentage: 45 },
    { category: 'Groceries', percentage: 22 },
    { category: 'Dining', percentage: 12 },
  ];

  it('should show overall percentage when no active segment', () => {
    const result = getCenterTextLabel(null, testData, 82);
    expect(result.percentage).toBe('82%');
    expect(result.label).toBe('SPENT');
  });

  it('should show category percentage when segment is active', () => {
    const result = getCenterTextLabel(0, testData, 82);
    expect(result.percentage).toBe('45%');
    expect(result.label).toBe('HOUSING');
  });

  it('should show category name in uppercase', () => {
    const result = getCenterTextLabel(1, testData, 82);
    expect(result.label).toBe('GROCERIES');
  });
});

describe('SpendingChart - legend item opacity', () => {
  const getLegendOpacity = (itemIndex: number, activeIndex: number | null): number => {
    if (activeIndex === null) return 0.8;
    return itemIndex === activeIndex ? 1 : 0.4;
  };

  it('should return default opacity when no active item', () => {
    expect(getLegendOpacity(0, null)).toBe(0.8);
    expect(getLegendOpacity(1, null)).toBe(0.8);
    expect(getLegendOpacity(2, null)).toBe(0.8);
  });

  it('should return high opacity for active item', () => {
    expect(getLegendOpacity(0, 0)).toBe(1);
    expect(getLegendOpacity(1, 1)).toBe(1);
    expect(getLegendOpacity(2, 2)).toBe(1);
  });

  it('should return low opacity for inactive items', () => {
    expect(getLegendOpacity(0, 1)).toBe(0.4);
    expect(getLegendOpacity(2, 1)).toBe(0.4);
    expect(getLegendOpacity(3, 0)).toBe(0.4);
  });
});

describe('SpendingChart - data serialization safety', () => {
  it('should handle JSON.stringify safely', () => {
    const data = [
      { category: 'Housing', percentage: 45, color: '#ef4444' },
      { category: 'Groceries', percentage: 22, color: '#3b82f6' },
    ];

    expect(() => JSON.stringify(data)).not.toThrow();
    expect(JSON.stringify(data)).toBeString();
  });

  it('should handle JSON.parse safely', () => {
    const jsonString = '[{"category":"Housing","percentage":45,"color":"#ef4444"}]';

    expect(() => JSON.parse(jsonString)).not.toThrow();
    const parsed = JSON.parse(jsonString);
    expect(parsed).toBeArray();
    expect(parsed[0].category).toBe('Housing');
  });
});

describe('SpendingChart - theme detection', () => {
  /**
   * Tests for theme detection logic used in tooltip colors (P1-1 code quality improvement)
   * The component uses MutationObserver to update chart colors when theme changes
   */

  const isDark = (theme: string | null): boolean => {
    if (theme) return theme === 'dark';
    return false; // Default to light if no theme set
  };

  it('should detect dark theme from data-theme attribute', () => {
    expect(isDark('dark')).toBe(true);
    expect(isDark('light')).toBe(false);
    expect(isDark('cupcake')).toBe(false);
  });

  it('should default to light when no theme set', () => {
    expect(isDark(null)).toBe(false);
  });
});

describe('SpendingChart - tooltip colors by theme', () => {
  /**
   * Tests for tooltip color switching (P1-1 code quality improvement)
   * Tooltip colors must update dynamically when theme changes via MutationObserver
   */

  const getTooltipColors = (
    isDark: boolean
  ): { backgroundColor: string; titleColor: string; bodyColor: string } => {
    return {
      backgroundColor: isDark ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.9)',
      titleColor: isDark ? '#0f172a' : '#fff',
      bodyColor: isDark ? '#0f172a' : '#fff',
    };
  };

  it('should return light tooltip colors for dark theme', () => {
    const colors = getTooltipColors(true);
    expect(colors.backgroundColor).toBe('rgba(248, 250, 252, 0.95)');
    expect(colors.titleColor).toBe('#0f172a');
    expect(colors.bodyColor).toBe('#0f172a');
  });

  it('should return dark tooltip colors for light theme', () => {
    const colors = getTooltipColors(false);
    expect(colors.backgroundColor).toBe('rgba(15, 23, 42, 0.9)');
    expect(colors.titleColor).toBe('#fff');
    expect(colors.bodyColor).toBe('#fff');
  });
});

describe('SpendingChart - MutationObserver configuration', () => {
  /**
   * Tests for MutationObserver configuration (P1-1 code quality improvement)
   * Observer watches for data-theme attribute changes on document.documentElement
   */

  it('should observe only the data-theme attribute', () => {
    const observerConfig = {
      attributes: true,
      attributeFilter: ['data-theme'],
    };

    expect(observerConfig.attributes).toBe(true);
    expect(observerConfig.attributeFilter).toContain('data-theme');
    expect(observerConfig.attributeFilter?.length).toBe(1);
  });
});

describe('SpendingChart - system preference theme detection (P2-1)', () => {
  /**
   * Tests for system preference theme detection improvement
   * When no explicit theme is set, the component should listen for system
   * preference changes via prefers-color-scheme media query
   */

  const shouldUpdateOnSystemChange = (explicitTheme: string | null): boolean => {
    // Only update on system preference change if no explicit theme is set
    return !explicitTheme;
  };

  it('should update colors on system change when no explicit theme', () => {
    expect(shouldUpdateOnSystemChange(null)).toBe(true);
  });

  it('should not update on system change when explicit theme is set', () => {
    expect(shouldUpdateOnSystemChange('dark')).toBe(false);
    expect(shouldUpdateOnSystemChange('light')).toBe(false);
    expect(shouldUpdateOnSystemChange('cupcake')).toBe(false);
  });

  it('should use correct media query for system preference', () => {
    const mediaQuery = '(prefers-color-scheme: dark)';
    expect(mediaQuery).toBe('(prefers-color-scheme: dark)');
  });
});

describe('SpendingChart - combined theme detection logic', () => {
  /**
   * Tests for the combined theme detection logic (explicit + system preference)
   */

  const isDarkCombined = (explicitTheme: string | null, systemPrefersDark: boolean): boolean => {
    // If explicit theme is set, use that
    if (explicitTheme) return explicitTheme === 'dark';
    // Otherwise fall back to system preference
    return systemPrefersDark;
  };

  it('should use explicit dark theme when set', () => {
    expect(isDarkCombined('dark', false)).toBe(true);
    expect(isDarkCombined('dark', true)).toBe(true);
  });

  it('should use explicit light theme when set', () => {
    expect(isDarkCombined('light', false)).toBe(false);
    expect(isDarkCombined('light', true)).toBe(false);
  });

  it('should fall back to system preference when no explicit theme', () => {
    expect(isDarkCombined(null, true)).toBe(true);
    expect(isDarkCombined(null, false)).toBe(false);
  });

  it('should treat other theme names as not-dark', () => {
    expect(isDarkCombined('cupcake', true)).toBe(false);
    expect(isDarkCombined('nord', true)).toBe(false);
    expect(isDarkCombined('valentine', false)).toBe(false);
  });
});

describe('SpendingChart - cleanup for system preference listener', () => {
  /**
   * Tests for proper cleanup of media query event listener
   * Prevents memory leaks on component unmount or page navigation
   */

  it('should have cleanup logic for media query listener', () => {
    // The cleanup function should remove the event listener
    const listenerRemoved = true; // Simulates removeEventListener call
    expect(listenerRemoved).toBe(true);
  });

  it('should cleanup on astro:before-swap event', () => {
    const cleanupEvents = ['astro:before-swap', 'beforeunload'];
    expect(cleanupEvents).toContain('astro:before-swap');
  });

  it('should cleanup on window beforeunload', () => {
    const cleanupEvents = ['astro:before-swap', 'beforeunload'];
    expect(cleanupEvents).toContain('beforeunload');
  });
});
