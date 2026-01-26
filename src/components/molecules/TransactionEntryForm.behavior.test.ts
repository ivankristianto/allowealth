/**
 * TransactionEntryForm Component Behavior Tests
 * ==============================================
 *
 * Tests the TransactionEntryForm molecule component for expense/income entry.
 *
 * Manual Testing Steps:
 * 1. View the component in transaction modal
 * 2. Verify form fields render correctly
 * 3. Test validation and submission
 * 4. Test toast notifications
 * 5. Test accessibility (keyboard, screen reader)
 *
 * Usage: bun test src/components/molecules/TransactionEntryForm.behavior.test.ts
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'bun:test';

const COMPONENT_PATH = 'src/components/molecules/TransactionEntryForm.astro';
const componentContent = readFileSync(COMPONENT_PATH, 'utf8');

describe('TransactionEntryForm Component', () => {
  describe('Component Structure', () => {
    it('should have form with data-transaction-form attribute', () => {
      expect(componentContent).toContain('data-transaction-form');
    });

    it('should have hidden type input field', () => {
      expect(componentContent).toContain('type="hidden" name="type"');
    });

    it('should have global error container', () => {
      expect(componentContent).toContain('class="hidden alert alert-error');
      expect(componentContent).toContain('role="alert"');
    });

    it('should have Title input field (required)', () => {
      expect(componentContent).toContain('name="title"');
      expect(componentContent).toContain('placeholder="e.g. Weekly Groceries"');
    });

    it('should have Amount field using CurrencyInput', () => {
      expect(componentContent).toContain('<CurrencyInput');
      expect(componentContent).toContain('name="amount"');
    });

    it('should have Date field using DatePicker', () => {
      expect(componentContent).toContain('<DatePicker');
      expect(componentContent).toContain('name="transaction_date"');
    });

    it('should have Category field using CategorySelect', () => {
      expect(componentContent).toContain('<CategorySelect');
      expect(componentContent).toContain('id={`${formId}-category`}');
    });

    it('should have Payment Method field using PaymentMethodSelect', () => {
      expect(componentContent).toContain('<PaymentMethodSelect');
      expect(componentContent).toContain('id={`${formId}-payment-method`}');
    });

    it('should have Cancel and Save Entry buttons', () => {
      expect(componentContent).toContain('data-close-modal');
      expect(componentContent).toContain('Cancel');
      expect(componentContent).toContain('Save Entry');
    });
  });

  describe('Props Interface', () => {
    it('should accept type prop (expense | income)', () => {
      expect(componentContent).toContain("type: 'expense' | 'income'");
    });

    it('should accept action prop for API endpoint', () => {
      expect(componentContent).toContain('action: string');
    });

    it('should accept values prop for default form values', () => {
      expect(componentContent).toContain('values?: {');
      expect(componentContent).toContain('title?: string');
      expect(componentContent).toContain('amount?: string');
    });

    it('should accept categories array prop', () => {
      expect(componentContent).toContain('categories: Array<');
    });

    it('should accept paymentMethods array prop', () => {
      expect(componentContent).toContain('paymentMethods: Array<');
    });

    it('should accept errors prop for validation errors', () => {
      expect(componentContent).toContain('errors?: Record<string, string>');
    });

    it('should accept modalId prop for closing modal on success', () => {
      expect(componentContent).toContain('modalId?: string');
    });
  });

  describe('Form Layout', () => {
    it('should have 2-column grid for Amount and Date', () => {
      expect(componentContent).toContain('grid grid-cols-1 sm:grid-cols-2 gap-4');
    });

    it('should have 2-column grid for Category and Payment Method', () => {
      // Multiple grid sections
      const gridMatches = componentContent.match(/grid grid-cols-1 sm:grid-cols-2 gap-4/g);
      expect(gridMatches?.length).toBeGreaterThanOrEqual(2);
    });

    it('should have vertical gap of 5 between form sections', () => {
      expect(componentContent).toContain('flex flex-col gap-5');
    });
  });

  describe('Client-Side Validation', () => {
    it('should have title validator', () => {
      expect(componentContent).toContain('title: {');
      expect(componentContent).toContain('Title is required');
      expect(componentContent).toContain('Title must not exceed 200 characters');
    });

    it('should have amount validator', () => {
      expect(componentContent).toContain('amount: {');
      expect(componentContent).toContain('Amount is required');
      expect(componentContent).toContain('Amount must be greater than 0');
    });

    it('should have transaction_date validator', () => {
      expect(componentContent).toContain('transaction_date: {');
      expect(componentContent).toContain('Date is required');
      expect(componentContent).toContain('Date cannot be in the future');
    });

    it('should have category_id validator', () => {
      expect(componentContent).toContain('category_id: {');
      expect(componentContent).toContain('Category is required');
    });

    it('should have payment_method_id validator', () => {
      expect(componentContent).toContain('payment_method_id: {');
      expect(componentContent).toContain('Payment method is required');
    });
  });

  describe('Toast Integration', () => {
    it('should import addToast from toastStore', () => {
      expect(componentContent).toContain("import { addToast } from '@/lib/stores/toastStore'");
    });

    it('should show success toast on successful submission', () => {
      // Success message includes type and action word (saved/updated)
      expect(componentContent).toContain('successfully!');
      expect(componentContent).toContain("transactionType === 'expense' ? 'Expense' : 'Income'");
    });

    it('should show error toast on submission failure', () => {
      expect(componentContent).toContain(
        "addToast(result.error?.message || 'Failed to save transaction', 'error')"
      );
    });

    it('should show error toast on network failure', () => {
      expect(componentContent).toContain("addToast('Network error. Please try again.', 'error')");
    });
  });

  describe('Modal Integration', () => {
    it('should close modal on successful submission', () => {
      expect(componentContent).toContain('closeModal()');
    });

    it('should have cancel button that closes modal', () => {
      expect(componentContent).toContain('data-close-modal={modalId}');
    });

    it('should refresh page after successful submission', () => {
      expect(componentContent).toContain('window.location.reload()');
    });
  });

  describe('Form Submission', () => {
    it('should submit to API endpoint with fetch', () => {
      expect(componentContent).toContain('const response = await fetch(apiUrl');
    });

    it('should send JSON body with form data', () => {
      expect(componentContent).toContain("getCsrfHeaders({ 'Content-Type': 'application/json' })");
      expect(componentContent).toContain('body: JSON.stringify(data)');
    });

    it('should clean amount value before submission', () => {
      expect(componentContent).toContain(".replace(/[^\\d.-]/g, '')");
    });

    it('should disable submit button during submission', () => {
      expect(componentContent).toContain('submitButton.disabled = true');
      expect(componentContent).toContain("submitButton.textContent = 'Saving...'");
    });

    it('should map title field to description for API compatibility', () => {
      // The form uses 'title' for UX but the API expects 'description'
      expect(componentContent).toContain("description: String(formData.get('title')");
    });
  });

  describe('Accessibility', () => {
    it('should have Label components for all fields', () => {
      expect(componentContent).toContain('<Label required');
      expect(componentContent).toContain('htmlFor=');
    });

    it('should have unique IDs for form fields', () => {
      expect(componentContent).toContain('id={`${formId}-title`}');
      expect(componentContent).toContain('id={`${formId}-amount`}');
      expect(componentContent).toContain('id={`${formId}-date`}');
    });

    it('should have aria-invalid on invalid fields', () => {
      expect(componentContent).toContain("field.setAttribute('aria-invalid', 'true')");
      expect(componentContent).toContain("field.setAttribute('aria-invalid', 'false')");
    });

    it('should have aria-describedby linking field to error', () => {
      expect(componentContent).toContain("field.setAttribute('aria-describedby', errorDivId)");
    });

    it('should have role="alert" on error messages', () => {
      expect(componentContent).toContain("errorDiv.setAttribute('role', 'alert')");
    });
  });

  describe('Imports', () => {
    it('should import Label atom', () => {
      expect(componentContent).toContain("import Label from '../atoms/Label.astro'");
    });

    it('should import Input atom', () => {
      expect(componentContent).toContain("import Input from '../atoms/Input.astro'");
    });

    it('should import CurrencyInput atom', () => {
      expect(componentContent).toContain(
        "import CurrencyInput from '../atoms/CurrencyInput.astro'"
      );
    });

    it('should import CategorySelect atom', () => {
      expect(componentContent).toContain(
        "import CategorySelect from '../atoms/CategorySelect.astro'"
      );
    });

    it('should import PaymentMethodSelect atom', () => {
      expect(componentContent).toContain(
        "import PaymentMethodSelect from '../atoms/PaymentMethodSelect.astro'"
      );
    });

    it('should import DatePicker atom', () => {
      expect(componentContent).toContain("import DatePicker from '../atoms/DatePicker.astro'");
    });

    it('should import Button atom', () => {
      expect(componentContent).toContain("import Button from '../atoms/Button.astro'");
    });
  });
});

/**
 * Manual Test Checklist
 * ====================
 *
 * Pre-test Setup:
 * [ ] Start dev server: bun run dev
 * [ ] Open a page with the transaction modal
 *
 * Test 1: Expense Form Display
 * [ ] Open expense modal
 * [ ] Verify Title field is present
 * [ ] Verify Amount field is present
 * [ ] Verify Date field defaults to today
 * [ ] Verify Category shows expense categories only
 * [ ] Verify Payment Method field is present
 *
 * Test 2: Income Form Display
 * [ ] Open income modal
 * [ ] Verify Title field is present
 * [ ] Verify Category shows income categories only
 *
 * Test 3: Form Validation - Title
 * [ ] Leave Title empty
 * [ ] Try to submit
 * [ ] Verify "Title is required" error
 * [ ] Enter very long title (>200 chars)
 * [ ] Verify max length error
 *
 * Test 4: Form Validation - Amount
 * [ ] Leave Amount empty
 * [ ] Verify "Amount is required" error
 * [ ] Enter 0 or negative amount
 * [ ] Verify "Amount must be greater than 0" error
 *
 * Test 5: Form Submission
 * [ ] Fill all required fields
 * [ ] Click "Save Entry"
 * [ ] Verify loading state ("Saving...")
 * [ ] Verify success toast appears
 * [ ] Verify modal closes
 * [ ] Verify page refreshes
 *
 * Test 6: Error Handling
 * [ ] Trigger API error (e.g., invalid session)
 * [ ] Verify error toast appears
 * [ ] Verify form remains open
 *
 * Test 7: Cancel Button
 * [ ] Open modal
 * [ ] Click "Cancel"
 * [ ] Verify modal closes
 * [ ] Verify no API call made
 *
 * Test 8: Keyboard Navigation
 * [ ] Tab through all form fields
 * [ ] Verify focus order is logical
 * [ ] Press Enter on submit button
 * [ ] Verify form submits
 *
 * Test 9: Screen Reader
 * [ ] Enable screen reader
 * [ ] Navigate form fields
 * [ ] Verify labels are announced
 * [ ] Trigger validation error
 * [ ] Verify error is announced
 */
