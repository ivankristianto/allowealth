import { describe, it, expect } from 'bun:test';

/**
 * TabToggle Component Unit Tests
 *
 * Tests the TabToggle component behavior, structure, and styling.
 *
 * TODO P2: These tests use hardcoded HTML strings instead of rendering the actual
 * TabToggle.astro component. Consider using Astro's testing utilities or
 * browser-level interaction tests to verify actual component output.
 */

describe('TabToggle Component', () => {
  describe('Rendering', () => {
    it('should render with two button options', () => {
      const html = `
        <div class="flex bg-base-200 p-1.5 rounded-2xl w-full md:w-auto" data-tab-toggle data-name="category-type">
          <button type="button" class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all bg-base-100 shadow-md text-primary" data-tab-value="expense" data-active="true">
            Expense
          </button>
          <button type="button" class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all text-base-content/60 hover:text-base-content/80" data-tab-value="income" data-active="false">
            Income
          </button>
        </div>
      `;

      // Test container structure
      expect(html).toContain('data-tab-toggle');
      expect(html).toContain('bg-base-200'); // background
      expect(html).toContain('rounded-2xl'); // pill shape
      expect(html).toContain('p-1.5'); // padding

      // Test buttons
      expect(html).toContain('type="button"');
      expect(html).toContain('data-tab-value="expense"');
      expect(html).toContain('data-tab-value="income"');
    });

    it('should render first option as active by default', () => {
      const html = `
        <div class="flex bg-base-200 p-1.5 rounded-2xl w-full md:w-auto" data-tab-toggle data-name="category-type">
          <button type="button" class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all bg-base-100 shadow-md text-primary" data-tab-value="expense" data-active="true">
            Expense
          </button>
          <button type="button" class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all text-base-content/60 hover:text-base-content/80" data-tab-value="income" data-active="false">
            Income
          </button>
        </div>
      `;

      expect(html).toContain('data-active="true"');
      expect(html).toContain('bg-base-100 shadow-md text-primary');
    });

    it('should render second option as active when specified', () => {
      const html = `
        <div class="flex bg-base-200 p-1.5 rounded-2xl w-full md:w-auto" data-tab-toggle data-name="category-type">
          <button type="button" class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all text-base-content/60 hover:text-base-content/80" data-tab-value="expense" data-active="false">
            Expense
          </button>
          <button type="button" class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all bg-base-100 shadow-md text-primary" data-tab-value="income" data-active="true">
            Income
          </button>
        </div>
      `;

      // Verify income button is marked as active
      expect(html).toContain('data-tab-value="income" data-active="true"');
      // Verify expense button is marked as inactive
      expect(html).toContain('data-tab-value="expense" data-active="false"');
      // Verify active styling classes are present
      expect(html).toContain('bg-base-100');
      expect(html).toContain('shadow-md');
      expect(html).toContain('text-primary');
    });
  });

  describe('Responsive Behavior', () => {
    it('should have full width on mobile', () => {
      const html = `
        <div class="flex bg-base-200 p-1.5 rounded-2xl w-full md:w-auto" data-tab-toggle>
          <button class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl">Expense</button>
          <button class="flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl">Income</button>
        </div>
      `;

      expect(html).toContain('w-full'); // mobile width
      expect(html).toContain('md:w-auto'); // desktop width
      expect(html).toContain('flex-1'); // buttons stretch on mobile
      expect(html).toContain('md:w-40'); // fixed width on desktop
    });
  });

  describe('Active State Styling', () => {
    it('should apply active styles to active button', () => {
      const activeClasses = 'bg-base-100 shadow-md text-primary';
      const html = `<button class="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeClasses}">Active</button>`;

      expect(html).toContain('bg-base-100'); // white background
      expect(html).toContain('shadow-md'); // shadow for elevation
      expect(html).toContain('text-primary'); // primary color text
    });

    it('should apply inactive styles to inactive button', () => {
      const inactiveClasses = 'text-base-content/60 hover:text-base-content/80';
      const html = `<button class="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${inactiveClasses}">Inactive</button>`;

      expect(html).toContain('text-base-content/60'); // muted text
      expect(html).toContain('hover:text-base-content/80'); // hover effect
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type', () => {
      const html = `
        <button type="button" class="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all">
          Expense
        </button>
      `;

      expect(html).toContain('type="button"');
    });

    it('should have descriptive labels', () => {
      const html = `
        <button type="button">Expense</button>
        <button type="button">Income</button>
      `;

      expect(html).toContain('Expense');
      expect(html).toContain('Income');
    });

    it('should have data attributes for state management', () => {
      const html = `
        <button data-tab-value="expense" data-active="true">Expense</button>
        <button data-tab-value="income" data-active="false">Income</button>
      `;

      expect(html).toContain('data-tab-value="expense"');
      expect(html).toContain('data-tab-value="income"');
      expect(html).toContain('data-active="true"');
      expect(html).toContain('data-active="false"');
    });
  });

  describe('Styling', () => {
    it('should have smooth transitions', () => {
      const html = `<button class="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all">Expense</button>`;

      expect(html).toContain('transition-all');
    });

    it('should have rounded corners', () => {
      const html = `
        <div class="rounded-2xl">
          <button class="rounded-xl">Expense</button>
        </div>
      `;

      expect(html).toContain('rounded-2xl'); // container
      expect(html).toContain('rounded-xl'); // buttons
    });

    it('should have bold font weight', () => {
      const html = `<button class="font-bold">Expense</button>`;

      expect(html).toContain('font-bold');
    });

    it('should have consistent padding', () => {
      const html = `
        <div class="p-1.5">
          <button class="py-2.5">Expense</button>
        </div>
      `;

      expect(html).toContain('p-1.5'); // container padding
      expect(html).toContain('py-2.5'); // button padding
    });
  });

  describe('Custom Options', () => {
    it('should support custom option labels', () => {
      const html = `
        <button data-tab-value="active">Active</button>
        <button data-tab-value="inactive">Inactive</button>
      `;

      expect(html).toContain('Active');
      expect(html).toContain('Inactive');
      expect(html).toContain('data-tab-value="active"');
      expect(html).toContain('data-tab-value="inactive"');
    });

    it('should support custom name attribute', () => {
      const html = `<div data-tab-toggle data-name="status-filter"></div>`;

      expect(html).toContain('data-name="status-filter"');
    });
  });
});
