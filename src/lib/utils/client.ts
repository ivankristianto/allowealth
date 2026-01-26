/**
 * Client-side utility functions
 *
 * Utilities for browser/client-side JavaScript.
 * These should only be imported in client-side scripts.
 */

/**
 * Debounce function execution
 *
 * Delays the execution of a function until after a specified wait time
 * has elapsed since the last time it was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   fetchResults(query);
 * }, 300);
 *
 * // Will only execute once after 300ms of no more calls
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function execution
 *
 * Ensures a function is called at most once in a specified time period.
 *
 * @param func - The function to throttle
 * @param limit - The number of milliseconds to throttle
 * @returns Throttled function
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event');
 * }, 100);
 *
 * // Will execute at most once every 100ms
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function throttled(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
