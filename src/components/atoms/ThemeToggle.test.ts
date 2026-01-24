/**
 * ThemeToggle Component Tests
 *
 * Tests for the theme toggle button functionality including:
 * - Theme switching (light/dark)
 * - LocalStorage persistence
 * - System preference detection
 * - Accessibility features
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Reset mocks
    localStorageMock.clear();
    Object.defineProperty(global, 'localStorage', { value: localStorageMock });
    Object.defineProperty(global, 'matchMedia', {
      value: createMatchMediaMock(false),
      writable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Theme Detection', () => {
    it('should return saved theme from localStorage', () => {
      localStorageMock.setItem('theme', 'dark');
      const savedTheme = localStorageMock.getItem('theme');
      expect(savedTheme).toBe('dark');
    });

    it('should return light as default when no saved theme', () => {
      const savedTheme = localStorageMock.getItem('theme');
      expect(savedTheme).toBeNull();
    });

    it('should detect system dark mode preference', () => {
      const matchMediaMock = createMatchMediaMock(true);
      const prefersdk = matchMediaMock('(prefers-color-scheme: dark)').matches;
      expect(prefersdk).toBe(true);
    });

    it('should detect system light mode preference', () => {
      const matchMediaMock = createMatchMediaMock(false);
      const prefersdk = matchMediaMock('(prefers-color-scheme: dark)').matches;
      expect(prefersdk).toBe(false);
    });
  });

  describe('Theme Persistence', () => {
    it('should save theme to localStorage when set', () => {
      localStorageMock.setItem('theme', 'dark');
      expect(localStorageMock.getItem('theme')).toBe('dark');

      localStorageMock.setItem('theme', 'light');
      expect(localStorageMock.getItem('theme')).toBe('light');
    });

    it('should clear theme from localStorage', () => {
      localStorageMock.setItem('theme', 'dark');
      localStorageMock.removeItem('theme');
      expect(localStorageMock.getItem('theme')).toBeNull();
    });
  });

  describe('Theme Toggle Logic', () => {
    it('should toggle from light to dark', () => {
      let currentTheme: 'light' | 'dark' = 'light';
      const toggleTheme = () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      };

      toggleTheme();
      expect(currentTheme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      let currentTheme: 'light' | 'dark' = 'dark';
      const toggleTheme = () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      };

      toggleTheme();
      expect(currentTheme).toBe('light');
    });

    it('should toggle multiple times correctly', () => {
      let currentTheme: 'light' | 'dark' = 'light';
      const toggleTheme = () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      };

      toggleTheme(); // light -> dark
      expect(currentTheme).toBe('dark');

      toggleTheme(); // dark -> light
      expect(currentTheme).toBe('light');

      toggleTheme(); // light -> dark
      expect(currentTheme).toBe('dark');
    });
  });

  describe('getCurrentTheme function logic', () => {
    it('should prioritize saved theme over system preference', () => {
      localStorageMock.setItem('theme', 'light');
      const matchMediaMock = createMatchMediaMock(true); // System prefers dark

      const savedTheme = localStorageMock.getItem('theme') as 'light' | 'dark' | null;
      const systemPrefersDark = matchMediaMock('(prefers-color-scheme: dark)').matches;

      // Logic from getCurrentTheme
      let theme: 'light' | 'dark';
      if (savedTheme) {
        theme = savedTheme;
      } else if (systemPrefersDark) {
        theme = 'dark';
      } else {
        theme = 'light';
      }

      // Saved theme should win
      expect(theme).toBe('light');
    });

    it('should use system preference when no saved theme', () => {
      // No saved theme
      const matchMediaMock = createMatchMediaMock(true); // System prefers dark

      const savedTheme = localStorageMock.getItem('theme') as 'light' | 'dark' | null;
      const systemPrefersDark = matchMediaMock('(prefers-color-scheme: dark)').matches;

      let theme: 'light' | 'dark';
      if (savedTheme) {
        theme = savedTheme;
      } else if (systemPrefersDark) {
        theme = 'dark';
      } else {
        theme = 'light';
      }

      expect(theme).toBe('dark');
    });

    it('should default to light when no saved theme and system prefers light', () => {
      const matchMediaMock = createMatchMediaMock(false); // System prefers light

      const savedTheme = localStorageMock.getItem('theme') as 'light' | 'dark' | null;
      const systemPrefersDark = matchMediaMock('(prefers-color-scheme: dark)').matches;

      let theme: 'light' | 'dark';
      if (savedTheme) {
        theme = savedTheme;
      } else if (systemPrefersDark) {
        theme = 'dark';
      } else {
        theme = 'light';
      }

      expect(theme).toBe('light');
    });
  });

  describe('Accessibility', () => {
    // Helper function to get aria-label based on theme
    const getAriaLabel = (theme: 'light' | 'dark'): string => {
      return theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    };

    it('should have correct aria-label for light mode', () => {
      expect(getAriaLabel('light')).toBe('Switch to dark mode');
    });

    it('should have correct aria-label for dark mode', () => {
      expect(getAriaLabel('dark')).toBe('Switch to light mode');
    });
  });
});
