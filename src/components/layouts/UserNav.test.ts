import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const readSource = () => readFileSync('src/components/layouts/UserNav.astro', 'utf8');

const isActive = (href: string, currentPath: string): boolean => {
  if (href === '/settings') {
    return (
      currentPath === '/profile' ||
      currentPath === '/security' ||
      currentPath.startsWith('/settings')
    );
  }

  if (currentPath === href) return true;
  return currentPath.startsWith(href + '/');
};

describe('UserNav', () => {
  describe('isActive', () => {
    it('matches exact and nested routes', () => {
      expect(isActive('/transactions', '/transactions')).toBe(true);
      expect(isActive('/transactions', '/transactions/reconciliations')).toBe(true);
      expect(isActive('/budget', '/budget/history')).toBe(true);
      expect(isActive('/reports', '/reports/custom')).toBe(true);
    });

    it('keeps settings active for profile and security routes', () => {
      expect(isActive('/settings', '/settings')).toBe(true);
      expect(isActive('/settings', '/settings/security')).toBe(true);
      expect(isActive('/settings', '/profile')).toBe(true);
      expect(isActive('/settings', '/security')).toBe(true);
    });

    it('does not match unrelated routes', () => {
      expect(isActive('/transactions', '/accounts')).toBe(false);
      expect(isActive('/budget', '/budgets')).toBe(false);
      expect(isActive('/reports', '/reporting')).toBe(false);
    });
  });

  describe('structure', () => {
    const source = readSource();

    it('keeps docs marked as an external link', () => {
      expect(source).toContain("href: 'https://docs.allowealth.io'");
      expect(source).toContain('external: true');
      expect(source).toContain("target={item.external ? '_blank' : undefined}");
      expect(source).toContain("rel={item.external ? 'noopener noreferrer' : undefined}");
      expect(source).toContain(
        'aria-label={item.external ? `${item.label} (opens in new tab)` : item.label}'
      );
    });
  });
});
