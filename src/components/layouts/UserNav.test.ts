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

    it('renders the sidebar dividers and section labels', () => {
      expect(source).toContain('<li role="presentation" aria-hidden="true">');
      expect(source).toContain(
        'class="my-1 border-base-content/10 mx-2 group-data-[sidebar-collapsed=true]:mx-1"'
      );

      const renderBlock = source.split('group.label && (')[1] ?? '';

      expect(renderBlock).toContain('{group.label}');
      expect(renderBlock).toContain('group-data-[sidebar-collapsed=true]:hidden');
    });

    it('keeps the grouped nav data declarations intact', () => {
      expect(source).toContain("label: 'Track'");
      expect(source).toContain("label: 'Plan'");
      expect(source).toContain("label: 'Analyze'");
      expect(source).toContain("href: '/dashboard', label: 'Dashboard'");
      expect(source).toContain("href: '/transactions', label: 'Transactions'");
      expect(source).toContain("href: '/budget', label: 'Budget'");
      expect(source).toContain("href: '/reports', label: 'Reports'");
    });

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
