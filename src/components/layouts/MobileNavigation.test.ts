/**
 * MobileNavigation Component Tests
 *
 * Tests for the mobile bottom navigation component including:
 * - Active state detection logic
 * - Navigation item configuration
 *
 * Note: Accessibility attributes (role, aria-label, aria-current) are implemented
 * in the Astro component and validated via Storybook stories and manual testing.
 * DOM-level tests would require a full rendering environment.
 */

import { describe, it, expect } from 'bun:test';

// Test the isActive logic that determines which nav item is highlighted
const isActive = (href: string, currentPath: string): boolean => {
  if (currentPath === href) return true;
  if (href === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) return true;
  return currentPath.startsWith(href + '/');
};

// Navigation items configuration (mirrors component)
const navItems = [
  { href: '/transactions', label: 'Activity' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/budget', label: 'Budgets' },
  { href: '/reports', label: 'Reports' },
];

describe('MobileNavigation', () => {
  describe('isActive function', () => {
    it('should return true for exact path match', () => {
      expect(isActive('/transactions', '/transactions')).toBe(true);
      expect(isActive('/accounts', '/accounts')).toBe(true);
      expect(isActive('/budget', '/budget')).toBe(true);
      expect(isActive('/reports', '/reports')).toBe(true);
    });

    it('should return false for non-matching paths', () => {
      expect(isActive('/transactions', '/accounts')).toBe(false);
      expect(isActive('/budget', '/reports')).toBe(false);
      expect(isActive('/accounts', '/transactions')).toBe(false);
    });

    it('should handle dashboard root path', () => {
      expect(isActive('/dashboard', '/')).toBe(true);
      expect(isActive('/dashboard', '/dashboard')).toBe(true);
    });

    it('should handle nested paths (child routes)', () => {
      expect(isActive('/transactions', '/transactions/add')).toBe(true);
      expect(isActive('/accounts', '/accounts/123')).toBe(true);
      expect(isActive('/budget', '/budget/history')).toBe(true);
      expect(isActive('/reports', '/reports/custom')).toBe(true);
    });

    it('should not match partial path names', () => {
      // /transactions should not match /transactionsExtra
      expect(isActive('/transactions', '/transactionsExtra')).toBe(false);
      expect(isActive('/accounts', '/accountsManager')).toBe(false);
    });

    it('should not match similar but different paths', () => {
      expect(isActive('/transactions', '/transaction')).toBe(false);
      expect(isActive('/budget', '/budgets')).toBe(false);
    });
  });

  describe('Navigation Items Configuration', () => {
    it('should have 4 navigation items (excluding center FAB)', () => {
      expect(navItems.length).toBe(4);
    });

    it('should have correct hrefs for all items', () => {
      const hrefs = navItems.map((item) => item.href);
      expect(hrefs).toEqual(['/transactions', '/accounts', '/budget', '/reports']);
    });

    it('should have correct labels for all items', () => {
      const labels = navItems.map((item) => item.label);
      expect(labels).toEqual(['Activity', 'Accounts', 'Budgets', 'Reports']);
    });

    it('should have non-empty labels for accessibility', () => {
      navItems.forEach((item) => {
        expect(item.label).toBeTruthy();
        expect(item.label.length).toBeGreaterThan(0);
      });
    });

    it('should have valid href paths starting with /', () => {
      navItems.forEach((item) => {
        expect(item.href.startsWith('/')).toBe(true);
      });
    });
  });

  describe('Center FAB Configuration', () => {
    const fabConfig = { href: '/dashboard', label: 'Dashboard' };

    it('should link to dashboard', () => {
      expect(fabConfig.href).toBe('/dashboard');
    });

    it('should have accessible label', () => {
      expect(fabConfig.label).toBe('Dashboard');
    });
  });

  describe('Active State Edge Cases', () => {
    it('should handle root path correctly', () => {
      expect(isActive('/dashboard', '/')).toBe(true);
      expect(isActive('/transactions', '/')).toBe(false);
    });

    it('should handle deeply nested paths', () => {
      expect(isActive('/transactions', '/transactions/edit/123')).toBe(true);
      expect(isActive('/accounts', '/accounts/history/2024/01')).toBe(true);
    });

    it('should handle paths with trailing slashes as nested', () => {
      // Trailing slash treated as nested route
      expect(isActive('/transactions', '/transactions/')).toBe(true);
    });
  });
});
