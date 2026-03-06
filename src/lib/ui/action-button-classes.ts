/**
 * Shared ActionBar button presets.
 *
 * Reuse these classes for toolbar/action-row buttons instead of duplicating inline strings.
 *
 * `min-h-11 min-w-11` enforces a 44x44px minimum touch target:
 * - keeps buttons accessible on mobile
 * - prevents `btn-sm` from shrinking tap targets too far
 * - keeps icon-only and icon+label buttons visually aligned
 */
export const ghostBtn =
  'btn btn-ghost btn-sm md:btn-md min-h-11 min-w-11 gap-1 md:gap-2 rounded-lg md:rounded-xl text-base-content/70 hover:text-base-content hover:bg-base-200 px-2 md:px-4';

export const accentGhostBtn =
  'btn btn-ghost btn-sm md:btn-md min-h-11 min-w-11 gap-1 md:gap-2 rounded-lg md:rounded-xl text-accent hover:text-accent hover:bg-accent/10 px-2 md:px-4 font-semibold';
