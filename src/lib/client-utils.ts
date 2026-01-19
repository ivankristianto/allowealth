/**
 * Client-side utility functions for Astro components.
 *
 * These utilities are designed to work in browser environments and are
 * imported via Astro's module scripts for use in inline scripts.
 *
 * IMPORTANT: These utilities must use browser-compatible APIs only.
 * Do not use Node.js-specific APIs (like `bun:` imports) in this file.
 */

/**
 * Escapes HTML special characters to prevent XSS attacks.
 *
 * This function safely converts user-provided text into HTML-safe content
 * by replacing special characters with their HTML entity equivalents.
 *
 * Uses direct string replacement for better performance and completeness
 * compared to DOM-based approaches.
 *
 * @param text - The text to escape
 * @returns The HTML-escaped string
 *
 * @example
 * ```ts
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = escapeHtml(userInput);
 * // Result: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Manages button loading state during async operations.
 *
 * This utility provides a consistent way to show loading state on buttons
 * during form submissions or other async operations using DaisyUI's spinner.
 *
 * @param button - The button element
 * @param isLoading - Whether to show or hide loading state
 *
 * @example
 * ```ts
 * const submitButton = form.querySelector('button[type="submit"]');
 * setButtonLoading(submitButton, true);  // Show loading
 * await submitForm();
 * setButtonLoading(submitButton, false); // Hide loading
 * ```
 */
export function setButtonLoading(
  button: HTMLButtonElement | null | undefined,
  isLoading: boolean
): void {
  if (!button) return;

  if (isLoading) {
    // Store original content before showing loading state
    if (!button.dataset.originalContent) {
      button.dataset.originalContent = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';
  } else {
    // Restore original content when done loading
    button.disabled = false;
    button.innerHTML = button.dataset.originalContent ?? button.innerHTML;
    delete button.dataset.originalContent;
  }
}
