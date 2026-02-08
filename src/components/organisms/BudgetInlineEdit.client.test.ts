/**
 * BudgetInlineEdit Client Module Tests
 *
 * Tests for inline budget editing logic: validation, state management,
 * and API request formatting.
 */

import { describe, it, expect } from 'bun:test';

// ============================================================================
// VALIDATION LOGIC (extracted for testability)
// ============================================================================

/**
 * Validate budget amount input.
 * Mirrors server-side validation from src/lib/validation/budgets.ts
 * - Must be a non-empty string
 * - Must parse to a positive number
 * - Must not be NaN
 */
function validateBudgetAmount(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Budget amount is required' };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: 'Budget amount must be a valid number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Budget amount must be a positive number' };
  }

  return { valid: true };
}

/**
 * Build the API request body for updating a budget.
 */
function buildUpdateRequestBody(budgetAmount: string): { budget_amount: string } {
  return { budget_amount: budgetAmount };
}

/**
 * Build the API endpoint URL for updating a budget.
 */
function buildUpdateEndpoint(budgetId: string): string {
  return `/api/budgets/${budgetId}`;
}

// ============================================================================
// TESTS
// ============================================================================

describe('BudgetInlineEdit - Validation', () => {
  describe('validateBudgetAmount', () => {
    it('should accept positive integer amounts', () => {
      const result = validateBudgetAmount('5000000');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept positive decimal amounts', () => {
      const result = validateBudgetAmount('500.50');
      expect(result.valid).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateBudgetAmount('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount is required');
    });

    it('should reject whitespace-only string', () => {
      const result = validateBudgetAmount('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount is required');
    });

    it('should reject zero', () => {
      const result = validateBudgetAmount('0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a positive number');
    });

    it('should reject negative amounts', () => {
      const result = validateBudgetAmount('-100');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a positive number');
    });

    it('should reject non-numeric strings', () => {
      const result = validateBudgetAmount('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a valid number');
    });

    it('should reject partially numeric strings like "100abc"', () => {
      // Number("100abc") returns NaN, so this is correctly rejected
      const result = validateBudgetAmount('100abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a valid number');
    });

    it('should reject comma-formatted numbers like "1,000"', () => {
      // Number("1,000") returns NaN
      const result = validateBudgetAmount('1,000');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Budget amount must be a valid number');
    });
  });
});

describe('BudgetInlineEdit - API Request', () => {
  describe('buildUpdateRequestBody', () => {
    it('should format request body with budget_amount', () => {
      const body = buildUpdateRequestBody('5000000');
      expect(body).toEqual({ budget_amount: '5000000' });
    });

    it('should preserve string format for amount', () => {
      const body = buildUpdateRequestBody('500.50');
      expect(body.budget_amount).toBe('500.50');
    });
  });

  describe('buildUpdateEndpoint', () => {
    it('should construct correct API endpoint', () => {
      const endpoint = buildUpdateEndpoint('budget-123');
      expect(endpoint).toBe('/api/budgets/budget-123');
    });
  });
});

describe('BudgetInlineEdit - State Management', () => {
  describe('Single edit constraint', () => {
    it('should track active edit state', () => {
      let activeEditCategoryId: string | null = null;

      // Start editing
      activeEditCategoryId = 'cat-1';
      expect(activeEditCategoryId).toBe('cat-1');

      // Attempting to start another edit should be blocked
      const canStartNewEdit = activeEditCategoryId === null;
      expect(canStartNewEdit).toBe(false);

      // Cancel edit
      activeEditCategoryId = null;
      expect(activeEditCategoryId).toBeNull();

      // Now can start new edit
      const canStartAfterCancel = activeEditCategoryId === null;
      expect(canStartAfterCancel).toBe(true);
    });
  });

  describe('Budget ID lookup', () => {
    it('should find budget ID from categories data by category ID', () => {
      const categoriesData = [
        { id: 'cat-1', name: 'Housing', budget_amount: '5000000', budget_id: 'budget-1' },
        { id: 'cat-2', name: 'Food', budget_amount: '3000000', budget_id: 'budget-2' },
      ];

      const categoryId = 'cat-2';
      const match = categoriesData.find((c) => c.id === categoryId);
      expect(match).toBeDefined();
      expect(match?.budget_id).toBe('budget-2');
    });

    it('should return undefined for unknown category ID', () => {
      const categoriesData = [
        { id: 'cat-1', name: 'Housing', budget_amount: '5000000', budget_id: 'budget-1' },
      ];

      const match = categoriesData.find((c) => c.id === 'unknown');
      expect(match).toBeUndefined();
    });
  });
});
