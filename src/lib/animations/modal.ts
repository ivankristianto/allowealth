/**
 * Modal Animation Configuration
 *
 * Shared animation constants for modal component using Motion library.
 * Matches styles.json modal animation specifications.
 *
 * @see Modal.astro
 */

/**
 * Modal backdrop animation options (duration and easing)
 * Backdrop uses simple fade effect for modal open/close
 */
export const MODAL_BACKDROP_ANIMATION_OPTIONS = {
  duration: 0.2,
  easing: [0.4, 0, 0.2, 1],
} as const;

/**
 * Modal content enter animation keyframes
 * Matches styles.json modal.animate preset
 */
export const MODAL_CONTENT_ENTER_KEYFRAMES = {
  opacity: [0, 1],
  scale: [0.95, 1],
  y: [20, 0],
} as const;

/**
 * Modal content exit animation keyframes
 * Matches styles.json modal.exit preset
 */
export const MODAL_CONTENT_EXIT_KEYFRAMES = {
  opacity: [1, 0],
  scale: [1, 0.95],
  y: [0, 20],
} as const;

/**
 * Modal content enter animation options (duration and easing)
 */
export const MODAL_CONTENT_ENTER_OPTIONS = {
  duration: 0.3,
  easing: [0.4, 0, 0.2, 1],
} as const;

/**
 * Modal content exit animation options (faster for snappy close feel)
 * Exit animations should be faster than entrance per UX best practices
 */
export const MODAL_CONTENT_EXIT_OPTIONS = {
  duration: 0.1,
  easing: [0.4, 0, 0.2, 1],
} as const;

/**
 * @deprecated Use MODAL_CONTENT_ENTER_OPTIONS or MODAL_CONTENT_EXIT_OPTIONS
 */
export const MODAL_CONTENT_ANIMATION_OPTIONS = MODAL_CONTENT_ENTER_OPTIONS;

/**
 * Initial scale value for modal content enter animation
 */
export const MODAL_INITIAL_SCALE = 0.95;

/**
 * Initial Y offset for modal content enter animation (in pixels)
 */
export const MODAL_INITIAL_Y_OFFSET = 20;

/**
 * Complete modal animation configuration
 * Combines all keyframes and options for convenient imports
 */
export const MODAL_ANIMATION_CONFIG = {
  backdrop: {
    options: MODAL_BACKDROP_ANIMATION_OPTIONS,
  },
  content: {
    enter: {
      keyframes: MODAL_CONTENT_ENTER_KEYFRAMES,
      options: MODAL_CONTENT_ENTER_OPTIONS,
    },
    exit: {
      keyframes: MODAL_CONTENT_EXIT_KEYFRAMES,
      options: MODAL_CONTENT_EXIT_OPTIONS,
    },
  },
} as const;

/**
 * Initial styles for modal content enter animation
 * Apply these to modal content element before triggering enter animation
 */
export const MODAL_CONTENT_INITIAL_STYLES = {
  opacity: '0',
  transform: `scale(${MODAL_INITIAL_SCALE}) translateY(${MODAL_INITIAL_Y_OFFSET}px)`,
} as const;

/**
 * Type for modal animation preset names
 */
export type ModalAnimationPreset = keyof typeof MODAL_ANIMATION_CONFIG;
