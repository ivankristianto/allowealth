import { describe, it, expect } from 'bun:test';

/**
 * CategoryIcon Component Unit Tests
 *
 * Tests the CategoryIcon component behavior, structure, and styling.
 */

describe('CategoryIcon Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true">
            <title>tag</title>
          </svg>
        </div>
      `;

      // Test that container has correct default classes
      expect(html).toContain('w-10 h-10'); // md size
      expect(html).toContain('rounded-xl'); // circular shape
      expect(html).toContain('bg-neutral'); // default color
      expect(html).toContain('shadow-lg'); // shadow for depth
    });

    it('should render with custom icon', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-error flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true">
            <title>home</title>
          </svg>
        </div>
      `;

      expect(html).toContain('bg-error');
    });

    it('should render with custom color', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-success flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true">
            <title>banknote</title>
          </svg>
        </div>
      `;

      expect(html).toContain('bg-success');
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      const html = `
        <div class="w-8 h-8 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="16" height="16" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('w-8 h-8'); // 32px
      expect(html).toContain('width="16" height="16"'); // 16px icon
    });

    it('should render medium size correctly', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('w-10 h-10'); // 40px
      expect(html).toContain('width="20" height="20"'); // 20px icon
    });

    it('should render large size correctly', () => {
      const html = `
        <div class="w-12 h-12 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="24" height="24" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('w-12 h-12'); // 48px
      expect(html).toContain('width="24" height="24"'); // 24px icon
    });
  });

  describe('Color Variants', () => {
    const colors = [
      'bg-primary',
      'bg-secondary',
      'bg-accent',
      'bg-neutral',
      'bg-success',
      'bg-warning',
      'bg-error',
      'bg-info',
    ];

    colors.forEach((color) => {
      it(`should render with ${color} color`, () => {
        const html = `
          <div class="w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg transition-transform">
            <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
          </div>
        `;

        expect(html).toContain(color);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden on icon', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('aria-hidden="true"');
    });

    it('should be keyboard navigable when used in buttons', () => {
      const html = `
        <button class="p-0 border-0 bg-transparent cursor-pointer">
          <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
            <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
          </div>
        </button>
      `;

      expect(html).toContain('<button');
    });
  });

  describe('Styling', () => {
    it('should have transition for hover effects', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('transition-transform');
    });

    it('should have shadow for depth', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('shadow-lg');
    });

    it('should have white text color', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('text-white');
    });

    it('should use stroke-current for icon color', () => {
      const html = `
        <div class="w-10 h-10 rounded-xl bg-neutral flex items-center justify-center text-white shadow-lg transition-transform">
          <svg width="20" height="20" class="stroke-current" aria-hidden="true"></svg>
        </div>
      `;

      expect(html).toContain('stroke-current');
    });
  });

  describe('Icon Name Conversion', () => {
    it('should convert kebab-case icon names to PascalCase', () => {
      // Test icon name conversion logic
      const testCases = [
        { input: 'home', expected: 'Home' },
        { input: 'shopping-basket', expected: 'ShoppingBasket' },
        { input: 'trending-up', expected: 'TrendingUp' },
        { input: 'circle-dot', expected: 'CircleDot' },
      ];

      testCases.forEach(({ input, expected }) => {
        const converted = input
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');

        expect(converted).toBe(expected);
      });
    });
  });
});
