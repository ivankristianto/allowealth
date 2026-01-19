/**
 * Client Utils Tests
 * ==================
 *
 * Unit tests for client-side utility functions.
 *
 * Note: `setButtonLoading` requires a DOM environment for full testing.
 * These tests cover the logic that can be tested without a browser.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { escapeHtml, setButtonLoading } from './client-utils';

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape greater than', () => {
    expect(escapeHtml('div>')).toBe('div&gt;');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('Hello "World"')).toBe('Hello &quot;World&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("It's")).toBe('It&#39;s');
  });

  it('should escape multiple special characters', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
  });

  it('should escape all special characters in one string', () => {
    expect(escapeHtml('<div>& " \'')).toBe('&lt;div&gt;&amp; &quot; &#39;');
  });

  it('should return empty string for non-string input', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
    expect(escapeHtml(123 as unknown as string)).toBe('');
    expect(escapeHtml({} as unknown as string)).toBe('');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should not modify safe strings', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('should handle special characters multiple times', () => {
    expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
    expect(escapeHtml('&&')).toBe('&amp;&amp;');
  });
});

describe('setButtonLoading', () => {
  let button: HTMLButtonElement;

  beforeEach(() => {
    // Create a mock button element for testing
    button = {
      disabled: false,
      innerHTML: 'Submit',
      dataset: {},
    } as unknown as HTMLButtonElement;
  });

  it('should return early for null button', () => {
    expect(setButtonLoading(null, true)).toBeUndefined();
    expect(setButtonLoading(undefined, true)).toBeUndefined();
  });

  it('should return early for undefined button', () => {
    expect(setButtonLoading(undefined, true)).toBeUndefined();
  });

  it('should store original content when setting loading state', () => {
    button.innerHTML = 'Original Text';
    setButtonLoading(button, true);

    expect(button.dataset.originalContent).toBe('Original Text');
  });

  it('should set disabled to true when loading', () => {
    button.disabled = false;
    setButtonLoading(button, true);

    expect(button.disabled).toBe(true);
  });

  it('should replace innerHTML with spinner when loading', () => {
    button.innerHTML = 'Submit';
    setButtonLoading(button, true);

    expect(button.innerHTML).toBe('<span class="loading loading-spinner loading-xs"></span>');
  });

  it('should restore original content when loading is false', () => {
    button.innerHTML = 'Original Text';
    setButtonLoading(button, true);
    setButtonLoading(button, false);

    expect(button.innerHTML).toBe('Original Text');
  });

  it('should set disabled to false when loading is false', () => {
    button.disabled = true;
    setButtonLoading(button, true);
    setButtonLoading(button, false);

    expect(button.disabled).toBe(false);
  });

  it('should remove originalContent data attribute after restore', () => {
    button.innerHTML = 'Original';
    setButtonLoading(button, true);
    setButtonLoading(button, false);

    expect(button.dataset.originalContent).toBeUndefined();
  });

  it('should preserve existing originalContent if already set', () => {
    button.innerHTML = 'First Content';
    setButtonLoading(button, true);
    button.innerHTML = 'Changed Content';
    setButtonLoading(button, true);

    // Should keep the first stored content
    expect(button.dataset.originalContent).toBe('First Content');
  });

  it('should handle button with complex HTML content', () => {
    button.innerHTML = '<span class="icon">+</span> Add Item';
    setButtonLoading(button, true);
    setButtonLoading(button, false);

    expect(button.innerHTML).toBe('<span class="icon">+</span> Add Item');
  });

  it('should handle empty button content', () => {
    button.innerHTML = '';
    setButtonLoading(button, true);

    expect(button.dataset.originalContent).toBe('');
    expect(button.disabled).toBe(true);
  });

  it('should handle multiple loading state toggles', () => {
    button.innerHTML = 'Submit';

    // First toggle
    setButtonLoading(button, true);
    expect(button.disabled).toBe(true);
    expect(button.innerHTML).toContain('loading-spinner');

    // Second toggle (restore)
    setButtonLoading(button, false);
    expect(button.disabled).toBe(false);
    expect(button.innerHTML).toBe('Submit');

    // Third toggle (loading again)
    setButtonLoading(button, true);
    expect(button.disabled).toBe(true);
    expect(button.innerHTML).toContain('loading-spinner');

    // Fourth toggle (restore again)
    setButtonLoading(button, false);
    expect(button.disabled).toBe(false);
    expect(button.innerHTML).toBe('Submit');
  });

  it('should restore to original content even if innerHTML changed while loading', () => {
    const originalContent = '<span>Save</span>';
    button.innerHTML = originalContent;
    setButtonLoading(button, true);

    // Simulate external code modifying the button
    button.innerHTML = 'Modified';

    setButtonLoading(button, false);

    // Should restore to original, not modified
    expect(button.innerHTML).toBe(originalContent);
  });

  it('should use current innerHTML as fallback if no original content stored', () => {
    button.innerHTML = 'Fallback Test';

    // Directly restore without setting loading first
    setButtonLoading(button, false);

    expect(button.disabled).toBe(false);
    // Should keep current content as fallback
    expect(button.innerHTML).toBe('Fallback Test');
  });
});
