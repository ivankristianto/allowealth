/**
 * Asset Utilities Unit Tests
 * ===========================
 * Tests for asset calculation and visualization utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  getAssetTypeColor,
  calculateAssetAllocation,
  formatTypeForDisplay,
  groupAssetsByType,
  calculateGroupTotals,
  calculatePortfolioTotals,
  sortAssetTypes,
  convertToIdr,
  convertIdrToUsd,
} from './asset';
import type { AssetOutput } from '@/lib/types/asset';

// Helper to create mock asset
const createMockAsset = (overrides: Partial<AssetOutput> = {}): AssetOutput => ({
  id: 'test-id',
  name: 'Test Asset',
  type: 'bank_account',
  balance: '1000000',
  currency: 'IDR',
  last_updated: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('Asset Utils - getAssetTypeColor', () => {
  it('should return predefined color for known asset types', () => {
    expect(getAssetTypeColor('stock')).toBe('#15803d'); // forest-600 (accent)
    expect(getAssetTypeColor('bank_account')).toBe('#0ea5e9'); // sky-500 (info)
    expect(getAssetTypeColor('mutual_fund')).toBe('#f59e0b');
    expect(getAssetTypeColor('bond')).toBe('#3b82f6');
    expect(getAssetTypeColor('crypto')).toBe('#8b5cf6');
    expect(getAssetTypeColor('other')).toBe('#9ca3af');
  });

  it('should return fallback color for unknown types with index', () => {
    const color = getAssetTypeColor('custom_type', 0);
    expect(color).toBe('#ec4899'); // First fallback color
  });

  it('should cycle through fallback colors based on index', () => {
    const color1 = getAssetTypeColor('unknown1', 0);
    const color2 = getAssetTypeColor('unknown2', 1);
    expect(color1).not.toBe(color2);
  });

  it('should return default gray for unknown types without index', () => {
    const color = getAssetTypeColor('completely_unknown');
    expect(color).toBe('#6b7280');
  });
});

describe('Asset Utils - convertToIdr', () => {
  it('should return same amount for IDR currency', () => {
    expect(convertToIdr(1000000, 'IDR')).toBe(1000000);
  });

  it('should convert USD to IDR using rate', () => {
    // Default rate is 15000
    expect(convertToIdr(100, 'USD')).toBe(1500000);
  });
});

describe('Asset Utils - convertIdrToUsd', () => {
  it('should convert IDR to USD using rate', () => {
    // Default rate is 15000
    expect(convertIdrToUsd(1500000)).toBe(100);
  });

  it('should handle zero amount', () => {
    expect(convertIdrToUsd(0)).toBe(0);
  });
});

describe('Asset Utils - calculateAssetAllocation', () => {
  it('should calculate allocation percentages correctly', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ type: 'stock', balance: '7500000', currency: 'IDR' }),
      createMockAsset({ type: 'bank_account', balance: '2500000', currency: 'IDR' }),
    ];

    const allocation = calculateAssetAllocation(assets);

    expect(allocation).toHaveLength(2);
    expect(allocation[0].type).toBe('Stock'); // Formatted
    expect(allocation[0].percentage).toBe(75);
    expect(allocation[1].type).toBe('Bank Account');
    expect(allocation[1].percentage).toBe(25);
  });

  it('should sort allocation by percentage descending', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ type: 'other', balance: '1000000', currency: 'IDR' }),
      createMockAsset({ type: 'stock', balance: '5000000', currency: 'IDR' }),
      createMockAsset({ type: 'bank_account', balance: '3000000', currency: 'IDR' }),
    ];

    const allocation = calculateAssetAllocation(assets);

    expect(allocation[0].type).toBe('Stock');
    expect(allocation[1].type).toBe('Bank Account');
    expect(allocation[2].type).toBe('Other');
  });

  it('should convert USD to IDR for percentage calculation', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ type: 'stock', balance: '15000000', currency: 'IDR' }),
      createMockAsset({ type: 'bank_account', balance: '1000', currency: 'USD' }), // 15M IDR
    ];

    const allocation = calculateAssetAllocation(assets);

    // Both should be 50% each
    expect(allocation).toHaveLength(2);
    expect(allocation[0].percentage).toBe(50);
    expect(allocation[1].percentage).toBe(50);
  });

  it('should return empty array for empty input', () => {
    const allocation = calculateAssetAllocation([]);
    expect(allocation).toHaveLength(0);
  });

  it('should filter out assets with zero or negative balance', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ type: 'stock', balance: '1000000', currency: 'IDR' }),
      createMockAsset({ type: 'bank_account', balance: '0', currency: 'IDR' }),
      createMockAsset({ type: 'other', balance: '-500', currency: 'IDR' }),
    ];

    const allocation = calculateAssetAllocation(assets);

    expect(allocation).toHaveLength(1);
    expect(allocation[0].type).toBe('Stock');
    expect(allocation[0].percentage).toBe(100);
  });

  it('should handle invalid balance strings', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ type: 'stock', balance: '1000000', currency: 'IDR' }),
      createMockAsset({ type: 'bank_account', balance: 'invalid', currency: 'IDR' }),
    ];

    const allocation = calculateAssetAllocation(assets);

    expect(allocation).toHaveLength(1);
    expect(allocation[0].type).toBe('Stock');
  });

  it('should assign colors to allocation items', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ type: 'stock', balance: '1000000', currency: 'IDR' }),
    ];

    const allocation = calculateAssetAllocation(assets);

    expect(allocation[0].color).toBe('#15803d'); // Stock color (forest-600 accent)
  });
});

describe('Asset Utils - formatTypeForDisplay', () => {
  it('should format known asset types', () => {
    expect(formatTypeForDisplay('bank_account')).toBe('Bank Account');
    expect(formatTypeForDisplay('mutual_fund')).toBe('Mutual Fund');
    expect(formatTypeForDisplay('stock')).toBe('Stock');
    expect(formatTypeForDisplay('crypto')).toBe('Cryptocurrency');
  });

  it('should format unknown types with title case', () => {
    expect(formatTypeForDisplay('custom_type')).toBe('Custom Type');
    expect(formatTypeForDisplay('some_new_category')).toBe('Some New Category');
  });
});

describe('Asset Utils - groupAssetsByType', () => {
  it('should group assets by their type', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ id: '1', type: 'stock', name: 'Stock 1' }),
      createMockAsset({ id: '2', type: 'stock', name: 'Stock 2' }),
      createMockAsset({ id: '3', type: 'bank_account', name: 'Bank 1' }),
    ];

    const grouped = groupAssetsByType(assets);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['stock']).toHaveLength(2);
    expect(grouped['bank_account']).toHaveLength(1);
  });

  it('should return empty object for empty input', () => {
    const grouped = groupAssetsByType([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe('Asset Utils - calculateGroupTotals', () => {
  it('should calculate totals by currency for a group', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: '1000000', currency: 'IDR' }),
      createMockAsset({ balance: '500000', currency: 'IDR' }),
      createMockAsset({ balance: '100', currency: 'USD' }),
    ];

    const totals = calculateGroupTotals(assets);

    expect(totals.idr).toBe(1500000);
    expect(totals.usd).toBe(100);
  });

  it('should handle empty array', () => {
    const totals = calculateGroupTotals([]);

    expect(totals.idr).toBe(0);
    expect(totals.usd).toBe(0);
  });

  it('should handle invalid balance strings', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: 'invalid', currency: 'IDR' }),
      createMockAsset({ balance: '1000', currency: 'IDR' }),
    ];

    const totals = calculateGroupTotals(assets);

    expect(totals.idr).toBe(1000);
  });
});

describe('Asset Utils - calculatePortfolioTotals', () => {
  it('should calculate total portfolio value in both currencies', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: '15000000', currency: 'IDR' }),
      createMockAsset({ balance: '1000', currency: 'USD' }), // 15M IDR equivalent
    ];

    const totals = calculatePortfolioTotals(assets);

    expect(totals.totalIdr).toBe(15000000); // Only IDR assets
    expect(totals.totalUsd).toBe(1000); // Only USD assets
  });

  it('should return zero for empty portfolio', () => {
    const totals = calculatePortfolioTotals([]);

    expect(totals.totalIdr).toBe(0);
    expect(totals.totalUsd).toBe(0);
  });

  it('should exclude invalid balances', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: '1000000', currency: 'IDR' }),
      createMockAsset({ balance: '-500', currency: 'IDR' }),
      createMockAsset({ balance: 'abc', currency: 'IDR' }),
    ];

    const totals = calculatePortfolioTotals(assets);

    expect(totals.totalIdr).toBe(1000000);
  });
});

describe('Asset Utils - sortAssetTypes', () => {
  it('should sort types by predefined order', () => {
    const types = ['other', 'bank_account', 'stock', 'mutual_fund'];
    const sorted = sortAssetTypes(types);

    expect(sorted).toEqual(['stock', 'bank_account', 'mutual_fund', 'other']);
  });

  it('should put unknown types at the end', () => {
    const types = ['stock', 'custom_type', 'bank_account'];
    const sorted = sortAssetTypes(types);

    expect(sorted[0]).toBe('stock');
    expect(sorted[1]).toBe('bank_account');
    expect(sorted[2]).toBe('custom_type');
  });

  it('should handle empty array', () => {
    const sorted = sortAssetTypes([]);
    expect(sorted).toHaveLength(0);
  });
});

describe('Asset Utils - Edge Cases', () => {
  it('should handle assets with decimal balances', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: '1000.50', currency: 'IDR' }),
      createMockAsset({ balance: '500.25', currency: 'IDR' }),
    ];

    const totals = calculateGroupTotals(assets);

    expect(totals.idr).toBe(1500.75);
  });

  it('should handle very large balances', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: '1000000000000', currency: 'IDR' }), // 1 trillion
    ];

    const allocation = calculateAssetAllocation(assets);

    expect(allocation).toHaveLength(1);
    expect(allocation[0].percentage).toBe(100);
    expect(allocation[0].totalIdr).toBe(1000000000000);
  });

  it('should handle portfolio with only USD assets', () => {
    const assets: AssetOutput[] = [
      createMockAsset({ balance: '1000', currency: 'USD' }),
      createMockAsset({ balance: '500', currency: 'USD' }),
    ];

    const totals = calculatePortfolioTotals(assets);

    expect(totals.totalIdr).toBe(0); // No IDR assets
    expect(totals.totalUsd).toBe(1500); // Sum of USD assets
  });
});
