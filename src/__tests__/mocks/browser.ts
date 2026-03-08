/**
 * Browser API Mocks
 * Shared mock utilities for testing code that depends on browser APIs.
 */

/**
 * Creates a deterministic UUID generator for testing.
 */
export function createMockCrypto() {
  let counter = 0;
  let originalRandomUUID: typeof globalThis.crypto.randomUUID | undefined;

  const mockRandomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
    const id = String(counter++).padStart(12, '0');
    return `00000000-0000-0000-0000-${id}`;
  };

  return {
    install: () => {
      originalRandomUUID = globalThis.crypto?.randomUUID;
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: mockRandomUUID,
        writable: true,
        configurable: true,
      });
    },
    reset: () => {
      counter = 0;
    },
    uninstall: () => {
      if (originalRandomUUID) {
        Object.defineProperty(globalThis.crypto, 'randomUUID', {
          value: originalRandomUUID,
          writable: true,
          configurable: true,
        });
      }
    },
  };
}

/**
 * Creates an in-memory localStorage mock.
 */
export function createMockLocalStorage() {
  let store: Record<string, string> = {};
  let originalLocalStorage: Storage | undefined;

  return {
    install: () => {
      originalLocalStorage = globalThis.localStorage;
      globalThis.localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (index: number) => {
          // Bounds check: ensure index is a non-negative integer
          if (!Number.isInteger(index) || index < 0) return null;
          return Object.keys(store)[index] ?? null;
        },
      };
    },
    reset: () => {
      store = {};
    },
    uninstall: () => {
      if (originalLocalStorage) {
        globalThis.localStorage = originalLocalStorage;
      }
    },
    getStore: () => ({ ...store }),
  };
}

/**
 * Creates a matchMedia mock for theme testing.
 */
export function createMockMatchMedia(prefersDark = false) {
  let originalMatchMedia: typeof globalThis.matchMedia | undefined;

  return {
    install: () => {
      originalMatchMedia = globalThis.matchMedia;
      globalThis.matchMedia = (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });
    },
    reset: () => {
      // No internal state to reset, but provided for API consistency
    },
    uninstall: () => {
      if (originalMatchMedia) {
        globalThis.matchMedia = originalMatchMedia;
      }
    },
  };
}
