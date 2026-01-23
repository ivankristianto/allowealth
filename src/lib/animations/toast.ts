/**
 * Toast Animation Configuration
 *
 * Shared animation constants for toast components using Motion library.
 * Matches styles.json toast animation specifications.
 *
 * @see Toast.astro
 * @see ToastContainer.astro
 */

/**
 * Toast enter animation keyframes
 * Matches styles.json toast.animate preset
 */
export const TOAST_ENTER_KEYFRAMES = {
  opacity: [0, 1],
  y: [-10, 0],
  scale: [0.95, 1],
};

/**
 * Toast exit animation keyframes
 * Matches styles.json toast.exit preset
 */
export const TOAST_EXIT_KEYFRAMES = {
  opacity: [1, 0],
  scale: [1, 0.95],
};

/**
 * Toast animation options (duration and easing)
 * Matches styles.json toast timing specifications
 */
export const TOAST_ANIMATION_OPTIONS = {
  duration: 0.2,
  easing: [0.4, 0, 0.2, 1],
};

/**
 * Complete toast animation configuration
 * Combines keyframes and options for convenient imports
 */
export const TOAST_ANIMATION_CONFIG = {
  enter: {
    keyframes: TOAST_ENTER_KEYFRAMES,
    options: TOAST_ANIMATION_OPTIONS,
  },
  exit: {
    keyframes: TOAST_EXIT_KEYFRAMES,
    options: TOAST_ANIMATION_OPTIONS,
  },
} as const;

/**
 * Initial styles for toast enter animation
 * Apply these to toast element before triggering enter animation
 */
export const TOAST_INITIAL_STYLES = {
  opacity: '0',
  transform: 'translateY(-10px) scale(0.95)',
} as const;

/**
 * Type for toast animation preset names
 */
export type ToastAnimationPreset = keyof typeof TOAST_ANIMATION_CONFIG;
