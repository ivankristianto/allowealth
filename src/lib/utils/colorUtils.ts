/**
 * Color Utilities
 *
 * Utilities for handling color conversions between Tailwind/DaisyUI
 * class names and hex values.
 */

/**
 * DaisyUI semantic color to hex mapping
 * These values are based on DaisyUI's default theme
 * and should be updated if the theme changes.
 */
const DAISYUI_COLORS: Record<string, string> = {
  // Semantic colors (with bg- prefix)
  'bg-primary': '#570df8',
  'bg-secondary': '#f000b8',
  'bg-accent': '#37cdbe',
  'bg-neutral': '#3d4451',
  'bg-success': '#36d399',
  'bg-warning': '#fbbd23',
  'bg-error': '#f87272',
  'bg-info': '#3abff8',
  // Without prefix (for flexibility)
  primary: '#570df8',
  secondary: '#f000b8',
  accent: '#37cdbe',
  neutral: '#3d4451',
  success: '#36d399',
  warning: '#fbbd23',
  error: '#f87272',
  info: '#3abff8',
};

/**
 * Check if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{3,8}$/.test(color);
}

/**
 * Convert a color value to hex
 *
 * Supports:
 * - Hex colors (#fff, #ffffff, #ffffffff)
 * - DaisyUI class names (bg-primary, bg-secondary, etc.)
 * - Tailwind class names (primary, secondary, etc.)
 *
 * @param color - Color value (hex or Tailwind class name)
 * @param fallback - Fallback hex color if conversion fails
 * @returns Hex color value
 */
export function toHexColor(color: string | null | undefined, fallback: string = '#6b7280'): string {
  if (!color) {
    return fallback;
  }

  // Already a hex color
  if (isValidHexColor(color)) {
    return color;
  }

  // Try to convert from DaisyUI/Tailwind class name
  const normalized = color.toLowerCase().trim();
  const mappedColor = DAISYUI_COLORS[normalized];

  if (mappedColor) {
    return mappedColor;
  }

  // Return fallback for unknown colors
  return fallback;
}

/**
 * Get the DaisyUI semantic color name from a class or hex
 *
 * @param color - Color value
 * @returns Semantic color name (e.g., 'primary') or null if not found
 */
export function getSemanticColorName(color: string): string | null {
  if (!color) return null;

  const normalized = color.toLowerCase().trim();

  // Direct match with bg- prefix
  if (normalized.startsWith('bg-')) {
    const name = normalized.replace('bg-', '');
    if (DAISYUI_COLORS[name]) {
      return name;
    }
  }

  // Direct match without prefix
  if (DAISYUI_COLORS[normalized]) {
    return normalized;
  }

  // Reverse lookup from hex
  for (const [name, hex] of Object.entries(DAISYUI_COLORS)) {
    if (!name.startsWith('bg-') && hex.toLowerCase() === normalized) {
      return name;
    }
  }

  return null;
}
