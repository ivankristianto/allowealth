/**
 * TransactionModal Component Behavior Tests
 * ==========================================
 *
 * Tests the TransactionModal organism component with type-specific styling.
 *
 * Manual Testing Steps:
 * 1. View expense modal - verify red icon and "New Expense" title
 * 2. View income modal - verify green icon and "New Income" title
 * 3. Test Scan button placeholder on expense modal
 * 4. Test form integration
 *
 * Usage: bun test src/components/organisms/TransactionModal.behavior.test.ts
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'bun:test';

const COMPONENT_PATH = 'src/components/organisms/TransactionModal.astro';
const componentContent = readFileSync(COMPONENT_PATH, 'utf8');

describe('TransactionModal Component', () => {
  describe('Component Structure', () => {
    it('should have modal container with data attributes', () => {
      expect(componentContent).toContain('data-transaction-modal-container');
      expect(componentContent).toContain('data-id={id}');
      expect(componentContent).toContain('data-type={type}');
    });

    it('should use Modal component wrapper', () => {
      expect(componentContent).toContain('<Modal');
      expect(componentContent).toContain('id={id}');
      expect(componentContent).toContain('size="md"');
    });

    it('should have header section with icon', () => {
      expect(componentContent).toContain('w-12 h-12 rounded-2xl');
    });

    it('should have title and subtitle', () => {
      expect(componentContent).toContain('{title}');
      expect(componentContent).toContain('{subtitle}');
    });

    it('should include TransactionEntryForm', () => {
      expect(componentContent).toContain('<TransactionEntryForm');
    });
  });

  describe('Props Interface', () => {
    it('should accept id prop', () => {
      expect(componentContent).toContain('id: string');
    });

    it('should accept type prop with expense/income options', () => {
      expect(componentContent).toContain("type?: 'expense' | 'income'");
    });

    it('should accept open prop', () => {
      expect(componentContent).toContain('open?: boolean');
    });

    it('should accept action prop', () => {
      expect(componentContent).toContain('action: string');
    });

    it('should accept values prop', () => {
      expect(componentContent).toContain('values?: {');
    });

    it('should accept categories prop', () => {
      expect(componentContent).toContain('categories?: Array<');
    });

    it('should accept assets prop', () => {
      expect(componentContent).toContain('assets?: Array<');
    });

    it('should accept errors prop', () => {
      expect(componentContent).toContain('errors?: Record<string, string>');
    });

    it('should accept showScanButton prop', () => {
      expect(componentContent).toContain('showScanButton?: boolean');
    });
  });

  describe('Type-Specific Styling', () => {
    it('should set isExpense based on type prop', () => {
      expect(componentContent).toContain("const isExpense = type === 'expense'");
    });

    it('should set title based on type and mode', () => {
      // Title uses nested ternary: isEditMode ? (isExpense ? 'Edit Expense' : 'Edit Income') : (isExpense ? 'New Expense' : 'New Income')
      expect(componentContent).toContain("'Edit Expense'");
      expect(componentContent).toContain("'Edit Income'");
      expect(componentContent).toContain("'New Expense'");
      expect(componentContent).toContain("'New Income'");
    });

    it('should have mode-dependent subtitle', () => {
      expect(componentContent).toContain("'Update the transaction details.'");
      expect(componentContent).toContain("'Log a manual transaction to your ledger.'");
    });

    it('should have error styling for expense icon background', () => {
      expect(componentContent).toContain("isExpense ? 'bg-error/10' : 'bg-success/10'");
    });

    it('should have error/success text colors for icons', () => {
      expect(componentContent).toContain("isExpense ? 'text-error' : 'text-success'");
    });
  });

  describe('Icons', () => {
    it('should import icons from lucide', () => {
      expect(componentContent).toContain(
        "import { CircleMinus, CirclePlus, Sparkles, Pencil } from '@lucide/astro'"
      );
    });

    it('should use CircleMinus for expense', () => {
      expect(componentContent).toContain('<CircleMinus');
    });

    it('should use CirclePlus for income', () => {
      expect(componentContent).toContain('<CirclePlus');
    });

    it('should have size 24 for type icons', () => {
      expect(componentContent).toContain('size={24}');
    });

    it('should have aria-hidden on decorative icons', () => {
      expect(componentContent).toContain('aria-hidden="true"');
    });
  });

  describe('Scan Button', () => {
    it('should show Scan button only for expense type in create mode', () => {
      expect(componentContent).toContain('!isEditMode && isExpense && showScanButton');
    });

    it('should have data-scan-button attribute', () => {
      expect(componentContent).toContain('data-scan-button');
    });

    it('should have aria-label for accessibility', () => {
      expect(componentContent).toContain('aria-label="Scan receipt"');
    });

    it('should use Sparkles icon', () => {
      expect(componentContent).toContain('<Sparkles');
    });

    it('should have hover animation on icon', () => {
      expect(componentContent).toContain('group-hover:animate-pulse');
    });
  });

  describe('Modal Configuration', () => {
    it('should have closable set to false (uses custom header)', () => {
      expect(componentContent).toContain('closable={false}');
    });

    it('should have backdropClose enabled', () => {
      expect(componentContent).toContain('backdropClose={true}');
    });
  });

  describe('Form Integration', () => {
    it('should pass type to TransactionEntryForm', () => {
      expect(componentContent).toContain('type={type}');
    });

    it('should pass action to TransactionEntryForm', () => {
      expect(componentContent).toContain('action={action}');
    });

    it('should pass values to TransactionEntryForm', () => {
      expect(componentContent).toContain('values={values}');
    });

    it('should pass categories to TransactionEntryForm', () => {
      expect(componentContent).toContain('categories={categories}');
    });

    it('should pass assets to TransactionEntryForm', () => {
      expect(componentContent).toContain('assets={assets}');
    });

    it('should pass modalId to TransactionEntryForm', () => {
      expect(componentContent).toContain('modalId={id}');
    });
  });

  describe('Client-Side Script', () => {
    it('should import addToast', () => {
      expect(componentContent).toContain("import { addToast } from '@/lib/stores/toastStore'");
    });

    it('should show toast for scan button click', () => {
      expect(componentContent).toContain("addToast('Receipt scanning coming soon!', 'info')");
    });

    it('should initialize on DOM ready', () => {
      expect(componentContent).toContain(
        "document.addEventListener('DOMContentLoaded', initTransactionModals)"
      );
    });

    it('should re-initialize on Astro page transitions', () => {
      expect(componentContent).toContain(
        "document.addEventListener('astro:page-load', initTransactionModals)"
      );
    });
  });

  describe('Accessibility', () => {
    it('should have h2 for modal title', () => {
      expect(componentContent).toContain('<h2 class=');
    });

    it('should have descriptive subtitle text', () => {
      expect(componentContent).toContain('Log a manual transaction to your ledger.');
    });
  });

  describe('Imports', () => {
    it('should import Modal component', () => {
      expect(componentContent).toContain("import Modal from '../molecules/Modal.astro'");
    });

    it('should import TransactionEntryForm component', () => {
      expect(componentContent).toContain(
        "import TransactionEntryForm from '../molecules/TransactionEntryForm.astro'"
      );
    });

    it('should import icons from lucide', () => {
      expect(componentContent).toContain("from '@lucide/astro'");
    });
  });
});

/**
 * Manual Test Checklist
 * ====================
 *
 * Pre-test Setup:
 * [ ] Start dev server: bun run dev
 * [ ] Navigate to dashboard or transactions page
 *
 * Test 1: Expense Modal Appearance
 * [ ] Click "Add Expense" quick action
 * [ ] Verify red minus circle icon appears
 * [ ] Verify title shows "New Expense"
 * [ ] Verify subtitle shows "Log a manual transaction to your ledger."
 * [ ] Verify Scan button is visible
 *
 * Test 2: Income Modal Appearance
 * [ ] Click "Log Income" quick action
 * [ ] Verify green plus circle icon appears
 * [ ] Verify title shows "New Income"
 * [ ] Verify Scan button is NOT visible
 *
 * Test 3: Scan Button Behavior
 * [ ] Open expense modal
 * [ ] Click Scan button
 * [ ] Verify "Receipt scanning coming soon!" toast appears
 * [ ] Verify toast type is 'info'
 *
 * Test 4: Modal Close Behavior
 * [ ] Open modal
 * [ ] Click backdrop area
 * [ ] Verify modal closes
 * [ ] Open modal again
 * [ ] Press Escape key
 * [ ] Verify modal closes
 *
 * Test 5: Form Integration
 * [ ] Open expense modal
 * [ ] Verify form shows expense categories
 * [ ] Open income modal
 * [ ] Verify form shows income categories
 *
 * Test 6: Header Button Integration
 * [ ] Click "New Entry" in header
 * [ ] Verify expense modal opens
 *
 * Test 7: Screen Reader
 * [ ] Enable screen reader
 * [ ] Open modal
 * [ ] Verify title is announced
 * [ ] Verify icons are not announced (aria-hidden)
 */
