/**
 * Toast Store Tests
 * =================
 * Unit tests for toast notification state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { createMockCrypto } from '@/__tests__/mocks/browser';
import { toasts, addToast, removeToast, type ToastType } from './toastStore';

const mockCrypto = createMockCrypto();

describe('toastStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    toasts.set([]);
    mockCrypto.reset();
    mockCrypto.install();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up store after each test
    toasts.set([]);
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('should add a toast to the store', () => {
      const id = addToast('Test message', 'info');
      const currentToasts = toasts.get();

      expect(currentToasts).toHaveLength(1);
      expect(currentToasts[0]?.message).toBe('Test message');
      expect(currentToasts[0]?.type).toBe('info');
      expect(currentToasts[0]?.id).toBe(id);
    });

    it('should generate unique IDs for each toast', () => {
      const id1 = addToast('First', 'info');
      const id2 = addToast('Second', 'info');
      const currentToasts = toasts.get();

      expect(id1).not.toBe(id2);
      expect(currentToasts).toHaveLength(2);
    });

    it('should use default duration based on type', () => {
      const successToast = addToast('Success', 'success');
      const errorToast = addToast('Error', 'error');
      const infoToast = addToast('Info', 'info');

      const currentToasts = toasts.get();
      const success = currentToasts.find((t) => t.id === successToast);
      const error = currentToasts.find((t) => t.id === errorToast);
      const info = currentToasts.find((t) => t.id === infoToast);

      expect(success?.duration).toBe(5000);
      expect(error?.duration).toBe(0); // Errors are persistent
      expect(info?.duration).toBe(5000);
    });

    it('should use custom duration when provided', () => {
      const id = addToast('Custom duration', 'success', { duration: 2000 });
      const currentToasts = toasts.get();
      const toast = currentToasts.find((t) => t.id === id);

      expect(toast?.duration).toBe(2000);
    });

    it('should support all toast types', () => {
      const types: ToastType[] = ['success', 'error', 'warning', 'info'];
      const ids = types.map((type) => addToast(`${type} message`, type));

      const currentToasts = toasts.get();
      expect(currentToasts).toHaveLength(4);

      types.forEach((type, index) => {
        const toast = currentToasts.find((t) => t.id === ids[index]);
        expect(toast?.type).toBe(type);
      });
    });

    it('should limit visible toasts to MAX_VISIBLE_TOASTS', () => {
      // Add 7 toasts (MAX_VISIBLE_TOASTS is 5)
      const ids = [];
      for (let i = 0; i < 7; i++) {
        ids.push(addToast(`Toast ${i}`, 'info'));
      }

      const currentToasts = toasts.get();
      expect(currentToasts).toHaveLength(5);

      // Should keep the last 5 toasts
      expect(currentToasts[0]?.message).toBe('Toast 2');
      expect(currentToasts[4]?.message).toBe('Toast 6');
    });

    it('should auto-dismiss toasts with duration > 0', () => {
      const shortDuration = 100;
      addToast('Auto-dismiss', 'success', { duration: shortDuration });

      const currentToasts = toasts.get();
      expect(currentToasts).toHaveLength(1);

      // Advance time past the auto-dismiss threshold
      vi.advanceTimersByTime(shortDuration + 50);

      const afterToasts = toasts.get();
      expect(afterToasts).toHaveLength(0);
    });

    it('should not auto-dismiss persistent toasts (duration = 0)', () => {
      addToast('Persistent error', 'error'); // Error has default duration 0

      const currentToasts = toasts.get();
      expect(currentToasts).toHaveLength(1);

      // Advance time - persistent toasts should not be dismissed
      vi.advanceTimersByTime(1000);

      const afterToasts = toasts.get();
      expect(afterToasts).toHaveLength(1); // Still there
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by ID', () => {
      const id = addToast('To remove', 'info');
      expect(toasts.get()).toHaveLength(1);

      removeToast(id);
      expect(toasts.get()).toHaveLength(0);
    });

    it('should only remove the specified toast', () => {
      const id1 = addToast('First', 'info');
      const id2 = addToast('Second', 'info');
      const id3 = addToast('Third', 'info');

      expect(toasts.get()).toHaveLength(3);

      removeToast(id2);
      const currentToasts = toasts.get();

      expect(currentToasts).toHaveLength(2);
      expect(currentToasts.find((t) => t.id === id1)).toBeDefined();
      expect(currentToasts.find((t) => t.id === id2)).toBeUndefined();
      expect(currentToasts.find((t) => t.id === id3)).toBeDefined();
    });

    it('should handle removing non-existent toast gracefully', () => {
      addToast('Existing', 'info');
      expect(toasts.get()).toHaveLength(1);

      // Try to remove non-existent toast
      removeToast('non-existent-id');

      // Should not affect existing toasts
      expect(toasts.get()).toHaveLength(1);
    });

    it('should handle removing from empty store', () => {
      expect(toasts.get()).toHaveLength(0);

      // Should not throw
      removeToast('any-id');

      expect(toasts.get()).toHaveLength(0);
    });
  });

  describe('store behavior', () => {
    it('should initialize with empty array', () => {
      expect(toasts.get()).toEqual([]);
    });

    it('should maintain toast order (newest at end)', () => {
      addToast('First', 'info');
      addToast('Second', 'info');
      addToast('Third', 'info');

      const currentToasts = toasts.get();
      expect(currentToasts[0]?.message).toBe('First');
      expect(currentToasts[1]?.message).toBe('Second');
      expect(currentToasts[2]?.message).toBe('Third');
    });

    it('should allow multiple toasts of same type', () => {
      addToast('Info 1', 'info');
      addToast('Info 2', 'info');
      addToast('Info 3', 'info');

      const currentToasts = toasts.get();
      expect(currentToasts).toHaveLength(3);
      expect(currentToasts.every((t) => t.type === 'info')).toBe(true);
    });
  });

  describe('ToastMessage type', () => {
    it('should create toasts with correct structure', () => {
      const id = addToast('Test', 'success');
      const currentToasts = toasts.get();
      const toast = currentToasts.find((t) => t.id === id);

      expect(toast).toBeDefined();
      expect(toast?.id).toBe(id);
      expect(toast?.message).toBe('Test');
      expect(toast?.type).toBe('success');
      expect(typeof toast?.duration).toBe('number');
    });

    it('should have string ID', () => {
      const id = addToast('Test', 'info');
      expect(typeof id).toBe('string');
    });

    it('should have numeric duration', () => {
      addToast('Test', 'warning');
      const currentToasts = toasts.get();
      expect(typeof currentToasts[0]?.duration).toBe('number');
    });
  });
});
