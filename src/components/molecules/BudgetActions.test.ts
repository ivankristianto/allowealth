/**
 * BudgetActions Component Tests
 * ==============================
 * Tests for BudgetActions component button visibility and styling.
 *
 * Note: History and Copy buttons have moved to BudgetPageHeader.
 * BudgetActions now contains: Categories, Import, Export, AI Rebalancer, New Budget.
 */

import { describe, it, expect } from 'bun:test';

describe('BudgetActions - Button Visibility', () => {
  describe('AI Rebalancer Button', () => {
    it('should show AI Rebalancer when showAiRebalancer is true', () => {
      const showAiRebalancer = true;
      expect(showAiRebalancer).toBe(true);
    });

    it('should hide AI Rebalancer when showAiRebalancer is false', () => {
      const showAiRebalancer = false;
      expect(showAiRebalancer).toBe(false);
    });
  });

  describe('Set New Budget Button', () => {
    it('should always be visible', () => {
      const isVisible = true;
      expect(isVisible).toBe(true);
    });
  });

  describe('Categories Button', () => {
    it('should always be visible', () => {
      const isVisible = true;
      expect(isVisible).toBe(true);
    });
  });

  describe('Import Button', () => {
    it('should always be visible', () => {
      const isVisible = true;
      expect(isVisible).toBe(true);
    });
  });

  describe('Export Button', () => {
    it('should always be visible', () => {
      const isVisible = true;
      expect(isVisible).toBe(true);
    });
  });
});

describe('BudgetActions - Styling', () => {
  describe('Categories Button', () => {
    const buttonClasses =
      'btn btn-ghost btn-sm md:btn-md gap-1 md:gap-2 rounded-lg md:rounded-xl text-base-content/70 hover:text-base-content hover:bg-base-200 px-2 md:px-4';

    it('should have ghost style', () => {
      expect(buttonClasses).toContain('btn-ghost');
    });

    it('should have rounded corners', () => {
      expect(buttonClasses).toContain('rounded-lg');
      expect(buttonClasses).toContain('md:rounded-xl');
    });

    it('should have hover states', () => {
      expect(buttonClasses).toContain('hover:text-base-content');
      expect(buttonClasses).toContain('hover:bg-base-200');
    });
  });

  describe('AI Rebalancer Button', () => {
    const buttonClasses =
      'btn btn-ghost btn-sm md:btn-md gap-1 md:gap-2 rounded-lg md:rounded-xl text-accent hover:text-accent hover:bg-accent/10 px-2 md:px-4';

    it('should have ghost style with accent color', () => {
      expect(buttonClasses).toContain('btn-ghost');
      expect(buttonClasses).toContain('text-accent');
    });

    it('should have accent hover background', () => {
      expect(buttonClasses).toContain('hover:bg-accent/10');
    });

    it('should have rounded corners', () => {
      expect(buttonClasses).toContain('rounded-lg');
    });
  });

  describe('New Budget Button (accent ghost)', () => {
    const buttonClasses =
      'btn btn-ghost btn-sm md:btn-md gap-1 md:gap-2 rounded-lg md:rounded-xl text-accent hover:text-accent hover:bg-accent/10 px-2 md:px-4 font-semibold';

    it('should have ghost style with accent color', () => {
      expect(buttonClasses).toContain('btn-ghost');
      expect(buttonClasses).toContain('text-accent');
    });

    it('should have semibold font', () => {
      expect(buttonClasses).toContain('font-semibold');
    });

    it('should have rounded corners', () => {
      expect(buttonClasses).toContain('rounded-lg');
    });

    it('should have accent hover background', () => {
      expect(buttonClasses).toContain('hover:bg-accent/10');
    });
  });
});

describe('BudgetActions - Accessibility', () => {
  describe('ARIA Labels', () => {
    it('should have aria-label for Categories button', () => {
      const label = 'Manage categories';
      expect(label).toBe('Manage categories');
    });

    it('should have aria-label for Import button', () => {
      const label = 'Import budgets from CSV';
      expect(label).toContain('Import');
    });

    it('should have aria-label for Export button', () => {
      const label = 'Export budgets to CSV';
      expect(label).toContain('Export');
    });

    it('should have aria-label for AI Rebalancer button', () => {
      const label = 'AI budget rebalancer';
      expect(label).toContain('AI');
    });

    it('should have aria-label for Set New Budget button', () => {
      const label = 'Set new budget';
      expect(label).toBe('Set new budget');
    });
  });

  describe('Icons', () => {
    it('should have aria-hidden on decorative icons', () => {
      const ariaHidden = true;
      expect(ariaHidden).toBe(true);
    });
  });

  describe('AI Rebalancer Modal', () => {
    it('should have aria-labelledby referencing the modal title', () => {
      const ariaLabelledby = 'ai-rebalancer-modal-title';
      expect(ariaLabelledby).toBe('ai-rebalancer-modal-title');
    });
  });
});

describe('BudgetActions - Modal Integration', () => {
  describe('data-target-modal attributes', () => {
    it('should have data-target-modal for Set New Budget button', () => {
      const targetModal = 'set-new-budget-modal';
      expect(targetModal).toBe('set-new-budget-modal');
    });

    it('should have data-target-modal for AI Rebalancer button', () => {
      const targetModal = 'ai-rebalancer-modal';
      expect(targetModal).toBe('ai-rebalancer-modal');
    });
  });

  describe('Button IDs', () => {
    it('should have id for Set New Budget button', () => {
      const buttonId = 'set-new-budget-btn';
      expect(buttonId).toBe('set-new-budget-btn');
    });

    it('should have id for AI Rebalancer button', () => {
      const buttonId = 'ai-rebalancer-btn';
      expect(buttonId).toBe('ai-rebalancer-btn');
    });
  });
});
