/**
 * Animations Module Barrel Export
 *
 * Provides a single entry point for importing all animation configurations.
 * Use this for cleaner imports when working with multiple animation types.
 *
 * @example
 * // Instead of:
 * import { TOAST_ANIMATION_CONFIG } from '@/lib/animations/toast';
 * import { MODAL_ANIMATION_CONFIG } from '@/lib/animations/modal';
 *
 * // You can use:
 * import { TOAST_ANIMATION_CONFIG, MODAL_ANIMATION_CONFIG } from '@/lib/animations';
 *
 * @module animations
 */

// Toast animations
export {
  TOAST_ENTER_KEYFRAMES,
  TOAST_EXIT_KEYFRAMES,
  TOAST_ANIMATION_OPTIONS,
  TOAST_ANIMATION_CONFIG,
  TOAST_INITIAL_STYLES,
} from './toast';
export type { ToastAnimationPreset } from './toast';

// Modal animations
export {
  MODAL_BACKDROP_ANIMATION_OPTIONS,
  MODAL_CONTENT_ENTER_KEYFRAMES,
  MODAL_CONTENT_EXIT_KEYFRAMES,
  MODAL_CONTENT_ANIMATION_OPTIONS,
  MODAL_INITIAL_SCALE,
  MODAL_INITIAL_Y_OFFSET,
  MODAL_ANIMATION_CONFIG,
  MODAL_CONTENT_INITIAL_STYLES,
} from './modal';
export type { ModalAnimationPreset } from './modal';

// Centralized animation utilities (from ../animation-utils.ts)
// Re-export general-purpose animation configurations
export {
  springs,
  durations,
  easings,
  presets,
  buttonAnimations,
  stagger,
  components,
  scroll,
  page,
  gestures,
  animateList,
} from '../animation-utils';
export type {
  SpringConfig,
  AnimationKeyframes,
  AnimationPreset,
  ComponentAnimation,
} from '../animation-utils';

// Drawer animations
export {
  DRAWER_BACKDROP_ANIMATION_OPTIONS,
  DRAWER_CONTENT_ENTER_KEYFRAMES,
  DRAWER_CONTENT_EXIT_KEYFRAMES,
  DRAWER_CONTENT_ENTER_OPTIONS,
  DRAWER_CONTENT_EXIT_OPTIONS,
  DRAWER_ANIMATION_CONFIG,
  DRAWER_CONTENT_INITIAL_STYLES,
} from './drawer';
