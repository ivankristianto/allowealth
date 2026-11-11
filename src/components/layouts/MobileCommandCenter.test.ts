import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const readSource = () => readFileSync('src/components/layouts/MobileCommandCenter.astro', 'utf8');

const isActive = (href: string, currentPath: string): boolean => {
  if (currentPath === href) return true;
  if (href === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) return true;
  return currentPath.startsWith(href + '/');
};

describe('MobileCommandCenter', () => {
  describe('isActive', () => {
    it('matches the dashboard root and nested routes', () => {
      expect(isActive('/dashboard', '/')).toBe(true);
      expect(isActive('/dashboard', '/dashboard')).toBe(true);
      expect(isActive('/dashboard', '/dashboard/overview')).toBe(true);
    });

    it('matches nested routes for track and plan sections', () => {
      expect(isActive('/transactions', '/transactions')).toBe(true);
      expect(isActive('/transactions', '/transactions/export')).toBe(true);
      expect(isActive('/budget', '/budget/history')).toBe(true);
      expect(isActive('/reports', '/reports/monthly')).toBe(true);
    });

    it('does not match unrelated routes', () => {
      expect(isActive('/budget', '/budgets')).toBe(false);
      expect(isActive('/reports', '/report')).toBe(false);
      expect(isActive('/accounts', '/dashboard')).toBe(false);
    });
  });

  describe('structure', () => {
    const source = readSource();

    it('keeps docs opened in a new tab', () => {
      expect(source).toContain('href="https://docs.allowealth.io"');
      expect(source).toContain('target="_blank"');
      expect(source).toContain('rel="noopener noreferrer"');
      expect(source).toContain('aria-label="Documentation (opens in new tab)"');
    });

    it('includes a drag handle for swipe gesture', () => {
      expect(source).toContain('data-drag-handle');
      expect(source).toContain('touch-none');
      expect(source).toContain('bg-base-content/30');
    });
  });
});
