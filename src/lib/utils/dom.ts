/**
 * DOM utility functions for event handling and interactivity.
 */

/**
 * Dispatches a custom event after the current animation frame.
 * Use this to trigger reinitialization of components after HTML injection.
 *
 * @example
 * dispatchReinitEvent('budget-summary:reinit');
 */
export function dispatchReinitEvent(eventName: string): void {
  requestAnimationFrame(() => {
    document.dispatchEvent(new CustomEvent(eventName));
  });
}
