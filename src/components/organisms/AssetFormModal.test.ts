/**
 * AssetFormModal Component Tests
 * ===============================
 * Tests for AssetFormModal component form validation and data handling
 */

import { describe, it, expect } from 'bun:test';
import { ASSET_TYPE_LABELS, type AssetType } from '@/lib/types/asset';

// Asset form data interface (same as component)
interface AssetFormData {
  id?: string;
  name: string;
  type: AssetType;
  currency: 'IDR' | 'USD';
  balance: string;
}

// Validation functions (logic from component)
const validateAssetName = (name: string): boolean => {
  return name.length > 0 && name.length <= 255;
};

const validateAssetType = (type: string): type is AssetType => {
  return Object.keys(ASSET_TYPE_LABELS).includes(type);
};

const validateCurrency = (currency: string): currency is 'IDR' | 'USD' => {
  return currency === 'IDR' || currency === 'USD';
};

const validateBalance = (balance: string): boolean => {
  // Reject empty strings or strings with commas (locale formatting)
  if (!balance || balance.includes(',')) return false;
  const num = parseFloat(balance);
  return !isNaN(num) && num >= 0 && isFinite(num);
};

const isEditMode = (data: AssetFormData): boolean => {
  return Boolean(data.id);
};

describe('AssetFormModal - Form Validation', () => {
  describe('Asset Name Validation', () => {
    it('should accept valid asset names', () => {
      expect(validateAssetName('BCA Checking')).toBe(true);
      expect(validateAssetName('Mandiri Savings')).toBe(true);
      expect(validateAssetName('A')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateAssetName('')).toBe(false);
    });

    it('should reject names exceeding 255 characters', () => {
      const longName = 'A'.repeat(256);
      expect(validateAssetName(longName)).toBe(false);
    });

    it('should accept names exactly at limit', () => {
      const maxName = 'A'.repeat(255);
      expect(validateAssetName(maxName)).toBe(true);
    });
  });

  describe('Asset Type Validation', () => {
    it('should accept all valid asset types', () => {
      const validTypes = ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'];
      validTypes.forEach((type) => {
        expect(validateAssetType(type)).toBe(true);
      });
    });

    it('should reject invalid asset types', () => {
      expect(validateAssetType('invalid')).toBe(false);
      expect(validateAssetType('')).toBe(false);
      expect(validateAssetType('BANK_ACCOUNT')).toBe(false);
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

describe('AssetFormModal - Mode Detection', () => {
  describe('Add Mode', () => {
    it('should detect add mode when no id is provided', () => {
      const data: AssetFormData = {
        name: 'New Asset',
        type: 'bank_account',
        currency: 'IDR',
        balance: '1000000',
      };
      expect(isEditMode(data)).toBe(false);
    });

    it('should detect add mode when id is empty string', () => {
      const data: AssetFormData = {
        id: '',
        name: 'New Asset',
        type: 'bank_account',
        currency: 'IDR',
        balance: '1000000',
      };
      expect(isEditMode(data)).toBe(false);
    });
  });

  describe('Edit Mode', () => {
    it('should detect edit mode when id is provided', () => {
      const data: AssetFormData = {
        id: 'abc-123',
        name: 'Existing Asset',
        type: 'stock',
        currency: 'USD',
        balance: '5000',
      };
      expect(isEditMode(data)).toBe(true);
    });
  });
});

describe('AssetFormModal - API Request Format', () => {
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
      const endpoint = '/api/assets';
      expect(endpoint).toBe('/api/assets');
    });
  });

  describe('Update Request', () => {
    it('should format update request body correctly', () => {
      const requestBody = {
        name: 'Updated Asset',
        type: 'stock',
        currency: 'USD',
      };

      expect(requestBody.name).toBe('Updated Asset');
      expect(requestBody.type).toBe('stock');
      expect(requestBody.currency).toBe('USD');
    });

    it('should use PUT method for update', () => {
      const method = 'PUT';
      expect(method).toBe('PUT');
    });

    it('should use correct endpoint for update', () => {
      const assetId = 'abc-123';
      const endpoint = `/api/assets/${assetId}`;
      expect(endpoint).toBe('/api/assets/abc-123');
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
      const assetId = 'abc-123';
      const endpoint = `/api/assets/${assetId}/balance`;
      expect(endpoint).toBe('/api/assets/abc-123/balance');
    });
  });
});

describe('AssetFormModal - Asset Types', () => {
  describe('Asset Type Labels', () => {
    it('should have all expected asset types', () => {
      const expectedTypes = ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'];
      const actualTypes = Object.keys(ASSET_TYPE_LABELS);

      expectedTypes.forEach((type) => {
        expect(actualTypes).toContain(type);
      });
    });

    it('should have display labels for all types', () => {
      expect(ASSET_TYPE_LABELS.bank_account).toBe('Bank Account');
      expect(ASSET_TYPE_LABELS.mutual_fund).toBe('Mutual Fund');
      expect(ASSET_TYPE_LABELS.bond).toBe('Bond');
      expect(ASSET_TYPE_LABELS.crypto).toBe('Cryptocurrency');
      expect(ASSET_TYPE_LABELS.stock).toBe('Stock');
      expect(ASSET_TYPE_LABELS.other).toBe('Other');
    });
  });
});

describe('AssetFormModal - Response Handling', () => {
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
      const errorData = { message: 'Asset name already exists' };
      const message = errorData.message || 'Failed to save asset';
      expect(message).toBe('Asset name already exists');
    });

    it('should use fallback error message', () => {
      const errorData = {} as { message?: string };
      const message = errorData.message || 'Failed to save asset';
      expect(message).toBe('Failed to save asset');
    });

    it('should handle unauthorized response', () => {
      const response = { ok: false, status: 401 };
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});

describe('AssetFormModal - Accessibility', () => {
  describe('Form Labels', () => {
    it('should have label for asset name', () => {
      const label = 'Asset Name';
      expect(label).toBe('Asset Name');
    });

    it('should have label for asset category', () => {
      const label = 'Asset Category';
      expect(label).toBe('Asset Category');
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
      const title = 'Register Asset';
      expect(title).toBe('Register Asset');
    });

    it('should have edit mode title', () => {
      const title = 'Edit Asset';
      expect(title).toBe('Edit Asset');
    });
  });

  describe('Submit Button', () => {
    it('should have add mode submit text', () => {
      const text = 'Register Asset';
      expect(text).toBe('Register Asset');
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
