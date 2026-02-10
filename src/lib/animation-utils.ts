/**
 * Animation Utilities
 *
 * Centralized animation configurations based on design-system/styles.json.
 * Uses Motion library for performant, declarative animations.
 *
 * @example
 * import { animate } from 'motion/mini';
 * import { presets, durations } from '@/lib/animation-utils';
 *
 * animate(element, presets.fadeIn.animate, { duration: durations.fast });
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Spring physics configuration for natural motion
 */
export interface SpringConfig {
  /** Stiffness of the spring (higher = more rigid) */
  stiffness: number;
  /** Damping ratio (lower = more oscillation) */
  damping: number;
  /** Mass of the object being animated */
  mass: number;
}

/**
 * Animation keyframe properties
 */
export interface AnimationKeyframes {
  /** Opacity value or array of values */
  opacity?: number | number[];
  /** X-axis translation */
  x?: number | number[];
  /** Y-axis translation */
  y?: number | number[];
  /** Scale transform */
  scale?: number | number[];
  /** Y-axis translation for hover effects */
  translateY?: number;
  /** Box shadow for hover effects */
  boxShadow?: string;
}

/**
 * Complete animation preset with initial and target states
 */
export interface AnimationPreset {
  /** Starting animation state */
  initial: AnimationKeyframes;
  /** Target animation state */
  animate: AnimationKeyframes;
  /** Duration in seconds (optional, uses spring if specified) */
  duration?: number;
  /** Spring configuration key (optional, overrides duration) */
  spring?: keyof typeof springs;
}

/**
 * Component-specific animation configurations
 */
export interface ComponentAnimation {
  /** Backdrop animation (for modals, dropdowns) */
  backdrop?: AnimationPreset;
  /** Content animation (for modals, cards) */
  content?: AnimationPreset;
  /** Enter animation */
  enter?: AnimationPreset;
  /** Exit animation */
  exit?: AnimationPreset;
  /** Hover state animation */
  hover?: Partial<AnimationKeyframes>;
  /** Tap/click animation */
  whileTap?: Partial<AnimationKeyframes>;
}

// ============================================================================
// Spring Configurations
// ============================================================================

/**
 * Spring physics configurations for natural motion
 * Based on styles.json animation.spring
 */
export const springs: Record<string, SpringConfig> = {
  /** Smooth, balanced spring - general purpose */
  smooth: { stiffness: 100, damping: 15, mass: 1 },

  /** Bouncy, playful spring - modals, popovers */
  bouncy: { stiffness: 300, damping: 10, mass: 1 },

  /** Gentle, soft spring - subtle transitions */
  gentle: { stiffness: 50, damping: 20, mass: 1 },

  /** Snappy, quick spring - buttons, toggles */
  snappy: { stiffness: 400, damping: 30, mass: 1 },
} as const;

// ============================================================================
// Duration Constants
// ============================================================================

/**
 * Animation duration presets in seconds
 * Based on styles.json animation.duration
 */
export const durations: Record<string, number> = {
  instant: 0,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 1,
} as const;

// ============================================================================
// Easing Functions
// ============================================================================

/**
 * Easing function configurations
 * Based on styles.json animation.easing
 */
export const easings: Record<string, [number, number, number, number]> = {
  default: [0.4, 0, 0.2, 1],
  in: [0.4, 0, 1, 1],
  out: [0, 0, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.68, -0.6, 0.32, 1.6],
} as const;

// ============================================================================
// Animation Presets
// ============================================================================

/**
 * Common animation presets for reuse
 * Based on styles.json animation.presets
 */
export const presets: Record<string, AnimationPreset> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    duration: 0.3,
  },

  fadeOut: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    duration: 0.3,
  },

  slideInFromBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    duration: 0.3,
  },

  slideInFromTop: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    duration: 0.3,
  },

  slideInFromLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    duration: 0.3,
  },

  slideInFromRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    duration: 0.3,
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    duration: 0.3,
  },

  scaleOut: {
    initial: { opacity: 1, scale: 1 },
    animate: { opacity: 0, scale: 0.9 },
    duration: 0.3,
  },

  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    spring: 'bouncy',
  },
} as const;

// ============================================================================
// Interaction Animations
// ============================================================================

/**
 * Button interaction animations
 * Based on styles.json animation.presets.buttonPress/buttonHover
 */
export const buttonAnimations = {
  press: {
    scale: 0.98,
    duration: 0.15,
  },
  hover: {
    scale: 1.05,
    duration: 0.15,
  },
} as const;

// ============================================================================
// Stagger Timing
// ============================================================================

/**
 * Stagger delays for sequential animations
 * Based on styles.json animation.stagger
 */
export const stagger: Record<string, number> = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const;

// ============================================================================
// Component-Specific Animations
// ============================================================================

/**
 * Pre-configured animations for common components
 * Based on styles.json animation.components
 */
export const components: Record<string, ComponentAnimation> = {
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      duration: 0.2,
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      duration: 0.3,
    },
  },

  toast: {
    enter: {
      initial: { opacity: 0, y: -10, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      duration: 0.2,
    },
    exit: {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 0, scale: 0.95 },
      duration: 0.2,
    },
  },

  dropdown: {
    enter: {
      initial: { opacity: 0, y: -8 },
      animate: { opacity: 1, y: 0 },
      duration: 0.15,
    },
    exit: {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 0, y: -8 },
      duration: 0.15,
    },
  },

  card: {
    hover: {
      translateY: -4,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
  },

  listItem: {
    enter: {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
      duration: 0.3,
    },
  },
} as const;

// ============================================================================
// Scroll Animations
// ============================================================================

/**
 * Scroll-triggered animations
 * Based on styles.json animation.scroll
 */
export const scroll = {
  fadeInView: {
    initial: { opacity: 0, y: 20 },
    inView: { opacity: 1, y: 0 },
    duration: 0.5,
  },
  scaleInView: {
    initial: { opacity: 0, scale: 0.8 },
    inView: { opacity: 1, scale: 1 },
    duration: 0.5,
  },
} as const;

// ============================================================================
// Page Transitions
// ============================================================================

/**
 * Page transition animations
 * Based on styles.json animation.page
 */
export const page = {
  transition: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    duration: 0.3,
  },
} as const;

// ============================================================================
// Gesture Animations
// ============================================================================

/**
 * Gesture-based interaction animations
 * Based on styles.json animation.gestures
 */
export const gestures = {
  tap: {
    scale: 0.98,
    duration: 0.15,
  },
  hover: {
    scale: 1.05,
    duration: 0.15,
  },
  drag: {
    dragConstraints: { top: 0, left: 0, right: 0, bottom: 0 },
    dragElastic: 0.2,
  },
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply staggered animation to a list of elements
 *
 * @example
 * import { animate } from 'motion';
 * import { animateList, presets, stagger } from '@/lib/animation-utils';
 *
 * const items = document.querySelectorAll('.list-item');
 * animateList(items, presets.fadeIn, stagger.normal);
 */
export function animateList(
  elements: NodeListOf<Element> | Element[],
  preset: AnimationPreset,
  staggerDelay: number = stagger.normal
): void {
  elements.forEach((element: Element, index: number) => {
    // Dynamic import to avoid SSR issues
    import('motion/mini').then(({ animate }) => {
      // Convert AnimationKeyframes to Motion's expected format
      const keyframes = preset.animate as Record<string, number | number[]>;
      animate(element, keyframes, {
        duration: preset.duration,
        delay: index * staggerDelay,
      });
    });
  });
}
