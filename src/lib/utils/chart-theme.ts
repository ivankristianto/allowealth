import { isDarkTheme } from '@/lib/utils/chart-lifecycle';

/**
 * Read a CSS custom property's computed value.
 * Chart.js needs raw color strings, not var() references.
 */
export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Chart color set derived from CSS tokens.
 * Call at chart init and on theme change — reads live DOM values.
 */
export function getChartThemeColors() {
  const dark = isDarkTheme();
  return {
    tooltipBg: dark ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.9)',
    tooltipTitle: getCssVar('--color-primary-content'),
    tooltipBody: getCssVar('--color-primary-content'),
    tickText: getCssVar('--color-neutral'),
    legendText: getCssVar('--color-neutral'),
    gridLine: dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)',
    accent: getCssVar('--color-accent'),
  };
}
