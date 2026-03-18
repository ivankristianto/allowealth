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

    it('renders the grouped navigation labels', () => {
      const trackSection = source.split('/* Track */')[1] ?? '';
      const planSection = source.split('/* Plan */')[1] ?? '';
      const analyzeSection = source.split('/* Analyze */')[1] ?? '';

      expect(trackSection).toContain('text-[10px] font-semibold uppercase tracking-widest');
      expect(trackSection).toContain('Track');
      expect(planSection).toContain('text-[10px] font-semibold uppercase tracking-widest');
      expect(planSection).toContain('Plan');
      expect(analyzeSection).toContain('text-[10px] font-semibold uppercase tracking-widest');
      expect(analyzeSection).toContain('Analyze');
      expect(source).toContain('Documentation');
      expect(source).toContain('Sign out');
    });

    it('keeps docs opened in a new tab', () => {
      expect(source).toContain('href="https://docs.allowealth.io"');
      expect(source).toContain('target="_blank"');
      expect(source).toContain('rel="noopener noreferrer"');
      expect(source).toContain('aria-label="Documentation (opens in new tab)"');
    });

    it('keeps the super-admin account card intact', () => {
      const adminBranch = source.split('/* Admin user section - unchanged */')[1] ?? '';

      expect(adminBranch).toContain('href="/profile"');
      expect(adminBranch).toContain('href="/security"');
      expect(adminBranch).toContain('href="/settings"');
      expect(adminBranch).toContain('Sign out');
    });
  });
});
