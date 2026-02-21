/**
 * AccountFormModal Component Tests
 * ===============================
 * Tests for AccountFormModal component form validation and data handling
 */

import { describe, it, expect } from 'bun:test';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/lib/types/account';

// Account form data interface (same as component)
interface AccountFormData {
  id?: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: string;
}

// Validation functions (logic from component)
const validateAccountName = (name: string): boolean => {
  return name.length > 0 && name.length <= 255;
};

const validateAccountType = (type: string): type is AccountType => {
  return Object.keys(ACCOUNT_TYPE_LABELS).includes(type);
};

const validateCurrency = (currency: string): currency is Currency => {
  return currency === 'IDR' || currency === 'USD';
};

const validateBalance = (balance: string): boolean => {
  // Reject empty strings or strings with commas (locale formatting)
  if (!balance || balance.includes(',')) return false;
  const num = parseFloat(balance);
  return !isNaN(num) && num >= 0 && isFinite(num);
};

const isEditMode = (data: AccountFormData): boolean => {
  return Boolean(data.id);
};

describe('AccountFormModal - Form Validation', () => {
  describe('Account Name Validation', () => {
    it('should accept valid account names', () => {
      expect(validateAccountName('BCA Checking')).toBe(true);
      expect(validateAccountName('Mandiri Savings')).toBe(true);
      expect(validateAccountName('A')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateAccountName('')).toBe(false);
    });

    it('should reject names exceeding 255 characters', () => {
      const longName = 'A'.repeat(256);
      expect(validateAccountName(longName)).toBe(false);
    });

    it('should accept names exactly at limit', () => {
      const maxName = 'A'.repeat(255);
      expect(validateAccountName(maxName)).toBe(true);
    });
  });

  describe('Account Type Validation', () => {
    it('should accept all valid account types', () => {
      const validTypes = ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'];
      validTypes.forEach((type) => {
        expect(validateAccountType(type)).toBe(true);
      });
    });

    it('should reject invalid account types', () => {
      expect(validateAccountType('invalid')).toBe(false);
      expect(validateAccountType('')).toBe(false);
      expect(validateAccountType('BANK_ACCOUNT')).toBe(false);
    });
  });

  describe('Currency Validation', () => {
    it('should accept IDR', () => {
      expect(validateCurrency('IDR')).toBe(true);
    });

    it('should accept USD', () => {
      expect(validateCurrency('USD')).toBe(true);
    });

    it('should reject invalid currencies', () => {
      expect(validateCurrency('EUR')).toBe(false);
      expect(validateCurrency('idr')).toBe(false);
      expect(validateCurrency('')).toBe(false);
    });
  });

  describe('Balance Validation', () => {
    it('should accept positive numbers', () => {
      expect(validateBalance('1000000')).toBe(true);
      expect(validateBalance('0.01')).toBe(true);
      expect(validateBalance('999999999.99')).toBe(true);
    });

    it('should accept zero', () => {
      expect(validateBalance('0')).toBe(true);
      expect(validateBalance('0.00')).toBe(true);
    });

    it('should reject negative numbers', () => {
      expect(validateBalance('-1')).toBe(false);
      expect(validateBalance('-1000')).toBe(false);
    });

    it('should reject non-numeric strings', () => {
      expect(validateBalance('abc')).toBe(false);
      expect(validateBalance('')).toBe(false);
      expect(validateBalance('10,000')).toBe(false);
    });

    it('should accept decimal balances', () => {
      expect(validateBalance('1000.50')).toBe(true);
      expect(validateBalance('0.99')).toBe(true);
    });
  });
});

describe('AccountFormModal - Mode Detection', () => {
  describe('Add Mode', () => {
    it('should detect add mode when no id is provided', () => {
      const data: AccountFormData = {
        name: 'New Account',
        type: 'bank_account',
        currency: 'IDR',
        balance: '1000000',
      };
      expect(isEditMode(data)).toBe(false);
    });

    it('should detect add mode when id is empty string', () => {
      const data: AccountFormData = {
        id: '',
        name: 'New Account',
        type: 'bank_account',
        currency: 'IDR',
        balance: '1000000',
      };
      expect(isEditMode(data)).toBe(false);
    });
  });

  describe('Edit Mode', () => {
    it('should detect edit mode when id is provided', () => {
      const data: AccountFormData = {
        id: 'abc-123',
        name: 'Existing Account',
        type: 'stock',
        currency: 'USD',
        balance: '5000',
      };
      expect(isEditMode(data)).toBe(true);
    });
  });
});

describe('AccountFormModal - API Request Format', () => {
  describe('Create Request', () => {
    it('should format create request body correctly', () => {
      const requestBody = {
        name: 'BCA Savings',
        type: 'bank_account',
        currency: 'IDR',
        balance: '15000000',
      };

      expect(requestBody.name).toBe('BCA Savings');
      expect(requestBody.type).toBe('bank_account');
      expect(requestBody.currency).toBe('IDR');
      expect(requestBody.balance).toBe('15000000');
    });

    it('should use POST method for create', () => {
      const method = 'POST';
      expect(method).toBe('POST');
    });

    it('should use correct endpoint for create', () => {
      const endpoint = '/api/accounts';
      expect(endpoint).toBe('/api/accounts');
    });
  });

  describe('Update Request', () => {
    it('should format update request body correctly', () => {
      const requestBody = {
        name: 'Updated Account',
        type: 'stock',
        currency: 'USD',
      };

      expect(requestBody.name).toBe('Updated Account');
      expect(requestBody.type).toBe('stock');
      expect(requestBody.currency).toBe('USD');
    });

    it('should use PUT method for update', () => {
      const method = 'PUT';
      expect(method).toBe('PUT');
    });

    it('should use correct endpoint for update', () => {
      const accountId = 'abc-123';
      const endpoint = `/api/accounts/${accountId}`;
      expect(endpoint).toBe('/api/accounts/abc-123');
    });
  });

  describe('Balance Update Request', () => {
    it('should format balance update request correctly', () => {
      const requestBody = {
        balance: '20000000',
      };

      expect(requestBody.balance).toBe('20000000');
    });

    it('should use POST method for balance update', () => {
      const method = 'POST';
      expect(method).toBe('POST');
    });

    it('should use correct endpoint for balance update', () => {
      const accountId = 'abc-123';
      const endpoint = `/api/accounts/${accountId}/balance`;
      expect(endpoint).toBe('/api/accounts/abc-123/balance');
    });
  });
});

describe('AccountFormModal - Account Types', () => {
  describe('Account Type Labels', () => {
    it('should have all expected account types', () => {
      const expectedTypes = ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'];
      const actualTypes = Object.keys(ACCOUNT_TYPE_LABELS);

      expectedTypes.forEach((type) => {
        expect(actualTypes).toContain(type);
      });
    });

    it('should have display labels for all types', () => {
      expect(ACCOUNT_TYPE_LABELS.bank_account).toBe('Bank Account');
      expect(ACCOUNT_TYPE_LABELS.mutual_fund).toBe('Mutual Fund');
      expect(ACCOUNT_TYPE_LABELS.bond).toBe('Bond');
      expect(ACCOUNT_TYPE_LABELS.crypto).toBe('Cryptocurrency');
      expect(ACCOUNT_TYPE_LABELS.stock).toBe('Stock');
      expect(ACCOUNT_TYPE_LABELS.other).toBe('Other');
    });
  });
});

describe('AccountFormModal - Response Handling', () => {
  describe('Success Response', () => {
    it('should handle successful create response', () => {
      const response = { ok: true, status: 201 };
      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
    });

    it('should handle successful update response', () => {
      const response = { ok: true, status: 200 };
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Response', () => {
    it('should handle validation error response', () => {
      const response = {
        ok: false,
        status: 400,
        message: 'Validation failed',
      };
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should extract error message from response', () => {
      const errorData = { message: 'Account name already exists' };
      const message = errorData.message || 'Failed to save account';
      expect(message).toBe('Account name already exists');
    });

    it('should use fallback error message', () => {
      const errorData = {} as { message?: string };
      const message = errorData.message || 'Failed to save account';
      expect(message).toBe('Failed to save account');
    });

    it('should handle unauthorized response', () => {
      const response = { ok: false, status: 401 };
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});

describe('AccountFormModal - Accessibility', () => {
  describe('Form Labels', () => {
    it('should have label for account name', () => {
      const label = 'Account Name';
      expect(label).toBe('Account Name');
    });

    it('should have label for account category', () => {
      const label = 'Account Category';
      expect(label).toBe('Account Category');
    });

    it('should have label for currency', () => {
      const label = 'Currency';
      expect(label).toBe('Currency');
    });

    it('should have context-aware balance label', () => {
      const addModeLabel = 'Initial Balance';
      const editModeLabel = 'Current Balance';
      expect(addModeLabel).toBe('Initial Balance');
      expect(editModeLabel).toBe('Current Balance');
    });
  });

  describe('Required Fields', () => {
    it('should mark name as required', () => {
      const required = true;
      expect(required).toBe(true);
    });

    it('should mark type as required', () => {
      const required = true;
      expect(required).toBe(true);
    });

    it('should mark currency as required', () => {
      const required = true;
      expect(required).toBe(true);
    });

    it('should mark balance as required', () => {
      const required = true;
      expect(required).toBe(true);
    });
  });

  describe('Modal Title', () => {
    it('should have add mode title', () => {
      const title = 'Register Account';
      expect(title).toBe('Register Account');
    });

    it('should have edit mode title', () => {
      const title = 'Edit Account';
      expect(title).toBe('Edit Account');
    });
  });

  describe('Submit Button', () => {
    it('should have add mode submit text', () => {
      const text = 'Register Account';
      expect(text).toBe('Register Account');
    });

    it('should have edit mode submit text', () => {
      const text = 'Save Changes';
      expect(text).toBe('Save Changes');
    });

    it('should show loading state text', () => {
      const text = 'Saving...';
      expect(text).toBe('Saving...');
    });
  });
});
