import { atom } from 'nanostores';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ToastOptions {
  duration?: number;
}

const MAX_VISIBLE_TOASTS = 5;

// Track timeouts for cleanup and race condition handling
const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

export const toasts = atom<ToastMessage[]>([]);

export function addToast(
  message: string,
  type: ToastType = 'info',
  options?: ToastOptions
): string {
  const id = crypto.randomUUID();
  const duration = options?.duration ?? getDefaultDuration(type);

  const toast: ToastMessage = { id, message, type, duration };

  const currentToasts = toasts.get();
  const updatedToasts = [...currentToasts.slice(-MAX_VISIBLE_TOASTS + 1), toast];
  toasts.set(updatedToasts);

  if (duration > 0) {
    const timeoutId = setTimeout(() => removeToast(id), duration);
    timeoutMap.set(id, timeoutId);
  }

  return id;
}

export function removeToast(id: string): void {
  // Cancel pending timeout to prevent race conditions
  const timeoutId = timeoutMap.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutMap.delete(id);
  }

  const currentToasts = toasts.get();
  const filteredToasts = currentToasts.filter((t) => t.id !== id);
  toasts.set(filteredToasts);
}

/**
 * Clear all toasts and cancel all pending timeouts.
 * Call this when navigating away from a page to prevent memory leaks.
 */
export function clearAllToasts(): void {
  // Clear all pending timeouts
  for (const timeoutId of timeoutMap.values()) {
    clearTimeout(timeoutId);
  }
  timeoutMap.clear();
  toasts.set([]);
}

function getDefaultDuration(type: ToastType): number {
  return type === 'error' ? 0 : 5000;
}
