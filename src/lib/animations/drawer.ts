/**
 * Drawer Animation Configuration
 *
 * Shared animation constants for drawer component using Motion library.
 */

// Drawer backdrop animation options (fade)
export const DRAWER_BACKDROP_ANIMATION_OPTIONS = {
  duration: 0.3,
  easing: [0.4, 0, 0.2, 1],
} as const;

// Drawer content enter animation keyframes (slide from right)
export const DRAWER_CONTENT_ENTER_KEYFRAMES = {
  transform: ['translateX(100%)', 'translateX(0%)'],
} as const;

// Drawer content exit animation keyframes (slide to right)
export const DRAWER_CONTENT_EXIT_KEYFRAMES = {
  transform: ['translateX(0%)', 'translateX(100%)'],
} as const;

// Drawer content enter animation options
export const DRAWER_CONTENT_ENTER_OPTIONS = {
  duration: 0.4,
  easing: [0.4, 0, 0.2, 1],
} as const;

// Drawer content exit animation options
export const DRAWER_CONTENT_EXIT_OPTIONS = {
  duration: 0.3,
  easing: [0.4, 0, 0.2, 1],
} as const;

export const DRAWER_ANIMATION_CONFIG = {
  backdrop: {
    options: DRAWER_BACKDROP_ANIMATION_OPTIONS,
  },
  content: {
    enter: {
      keyframes: DRAWER_CONTENT_ENTER_KEYFRAMES,
      options: DRAWER_CONTENT_ENTER_OPTIONS,
    },
    exit: {
      keyframes: DRAWER_CONTENT_EXIT_KEYFRAMES,
      options: DRAWER_CONTENT_EXIT_OPTIONS,
    },
  },
} as const;

export const DRAWER_CONTENT_INITIAL_STYLES = {
  transform: 'translateX(100%)',
} as const;
