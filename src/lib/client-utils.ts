/**
 * Client-side utility functions for Astro components.
 *
 * These utilities are designed to work in browser environments and are
 * imported via Astro's `define:vars` directive for use in inline scripts.
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
 * Creates a DaisyUI alert element HTML string for displaying messages.
 *
 * @param options - Alert configuration options
 * @param options.type - Alert type: 'success' or 'error'
 * @param options.message - The message to display (will be HTML-escaped)
 * @returns HTML string for the alert element
 *
 * @example
 * ```ts
 * const alertHtml = createAlert({
 *   type: 'success',
 *   message: 'Changes saved successfully!'
 * });
 * container.innerHTML = alertHtml;
 * ```
 */
export function createAlert(options: { type: 'success' | 'error'; message: string }): string {
  const { type, message } = options;
  const safeMessage = escapeHtml(message);

  const iconSvg =
    type === 'success'
      ? `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;

  return `
    <div role="alert" class="alert alert-${type}">
      ${iconSvg}
      <span>${safeMessage}</span>
    </div>
  `;
}

/**
 * Creates a success alert HTML string.
 *
 * Convenience function for creating success alerts.
 *
 * @param message - The success message to display
 * @returns HTML string for the success alert element
 *
 * @example
 * ```ts
 * container.innerHTML = createSuccessAlert('Profile updated!');
 * ```
 */
export function createSuccessAlert(message: string): string {
  return createAlert({ type: 'success', message });
}

/**
 * Creates an error alert HTML string.
 *
 * Convenience function for creating error alerts.
 *
 * @param message - The error message to display
 * @returns HTML string for the error alert element
 *
 * @example
 * ```ts
 * container.innerHTML = createErrorAlert('Failed to save. Please try again.');
 * ```
 */
export function createErrorAlert(message: string): string {
  return createAlert({ type: 'error', message });
}

/**
 * Manages button loading state during async operations.
 *
 * This utility provides a consistent way to show loading state on buttons
 * during form submissions or other async operations.
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

  const buttonText = button.querySelector('[data-button-text]');
  const loadingSpinner = button.querySelector('[data-loading-spinner]');

  if (isLoading) {
    buttonText?.classList.add('hidden');
    loadingSpinner?.classList.remove('hidden');
    button.disabled = true;
  } else {
    buttonText?.classList.remove('hidden');
    loadingSpinner?.classList.add('hidden');
    button.disabled = false;
  }
}
