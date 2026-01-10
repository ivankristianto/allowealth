/**
 * Asset Priority Calculation Tests
 * ================================
 * Unit tests for asset priority utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  calculateAssetPriority,
  needsAssetUpdate,
  getDaysSinceUpdate,
  getPriorityValue,
  sortAssetsByPriority,
  filterAssetsNeedingUpdate,
  getAssetsByPriority,
  countAssetsByPriority,
  getNextUpdateDate,
  isUpdateOverdue,
  PRIORITY_THRESHOLDS,
  type AssetPriority,
} from './priority';

describe('PRIORITY_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(PRIORITY_THRESHOLDS.HIGH).toBe(30);
    expect(PRIORITY_THRESHOLDS.MEDIUM).toBe(14);
    expect(PRIORITY_THRESHOLDS.LOW).toBe(7);
  });
});

describe('calculateAssetPriority', () => {
  it('should return high priority for >30 days', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const result = calculateAssetPriority(thirtyOneDaysAgo);
    expect(result.priority).toBe('high');
    expect(result.daysSinceUpdate).toBe(31);
    expect(result.needsUpdate).toBe(true);
  });

  it('should return medium priority for >14 days', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const result = calculateAssetPriority(fifteenDaysAgo);
    expect(result.priority).toBe('medium');
    expect(result.daysSinceUpdate).toBe(15);
    expect(result.needsUpdate).toBe(true);
  });

  it('should return low priority for >7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = calculateAssetPriority(tenDaysAgo);
    expect(result.priority).toBe('low');
    expect(result.daysSinceUpdate).toBe(10);
    expect(result.needsUpdate).toBe(true);
  });

  it('should return none priority for <=7 days', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = calculateAssetPriority(fiveDaysAgo);
    expect(result.priority).toBe('none');
    expect(result.daysSinceUpdate).toBe(5);
    expect(result.needsUpdate).toBe(false);
  });

  it('should return none priority for today', () => {
    const today = new Date();
    const result = calculateAssetPriority(today);
    expect(result.priority).toBe('none');
    expect(result.daysSinceUpdate).toBe(0);
    expect(result.needsUpdate).toBe(false);
  });

  it('should return high priority for null lastUpdated', () => {
    const result = calculateAssetPriority(null);
    expect(result.priority).toBe('high');
    expect(result.daysSinceUpdate).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.needsUpdate).toBe(true);
    expect(result.lastUpdated).toBe(null);
  });

  it('should return high priority for undefined lastUpdated', () => {
    const result = calculateAssetPriority(undefined);
    expect(result.priority).toBe('high');
    expect(result.daysSinceUpdate).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.needsUpdate).toBe(true);
    expect(result.lastUpdated).toBe(null);
  });

  it('should handle exact threshold boundaries', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result30 = calculateAssetPriority(thirtyDaysAgo);
    expect(result30.priority).toBe('medium');

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result14 = calculateAssetPriority(fourteenDaysAgo);
    expect(result14.priority).toBe('low');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result7 = calculateAssetPriority(sevenDaysAgo);
    expect(result7.priority).toBe('none');
  });
});

describe('needsAssetUpdate', () => {
  it('should return true for assets needing update', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(needsAssetUpdate(tenDaysAgo)).toBe(true);
  });

  it('should return false for recently updated assets', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(needsAssetUpdate(fiveDaysAgo)).toBe(false);
  });

  it('should return true for null lastUpdated', () => {
    expect(needsAssetUpdate(null)).toBe(true);
  });

  it('should return true for undefined lastUpdated', () => {
    expect(needsAssetUpdate(undefined)).toBe(true);
  });
});

describe('getDaysSinceUpdate', () => {
  it('should calculate days correctly', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(getDaysSinceUpdate(tenDaysAgo)).toBe(10);
  });

  it('should return 0 for today', () => {
    const today = new Date();
    expect(getDaysSinceUpdate(today)).toBe(0);
  });

  it('should return MAX_SAFE_INTEGER for null', () => {
    expect(getDaysSinceUpdate(null)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should return MAX_SAFE_INTEGER for undefined', () => {
    expect(getDaysSinceUpdate(undefined)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('getPriorityValue', () => {
  it('should return correct numeric values', () => {
    expect(getPriorityValue('high')).toBe(4);
    expect(getPriorityValue('medium')).toBe(3);
    expect(getPriorityValue('low')).toBe(2);
    expect(getPriorityValue('none')).toBe(1);
  });

  it('should handle all priority types', () => {
    const priorities: AssetPriority[] = ['high', 'medium', 'low', 'none'];
    priorities.forEach((priority) => {
      const value = getPriorityValue(priority);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(4);
    });
  });
});

describe('sortAssetsByPriority', () => {
  interface TestAsset {
    id: string;
    lastUpdated: Date | null;
  }

  it('should sort assets by priority descending', () => {
    const assets: TestAsset[] = [
      { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // none
      { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }, // high
      { id: '3', lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }, // medium
      { id: '4', lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // low
    ];

    const sorted = sortAssetsByPriority(assets);
    if (sorted[0]) expect(sorted[0].id).toBe('2'); // high
    if (sorted[1]) expect(sorted[1].id).toBe('3'); // medium
    if (sorted[2]) expect(sorted[2].id).toBe('4'); // low
    if (sorted[3]) expect(sorted[3].id).toBe('1'); // none
  });

  it('should not mutate original array', () => {
    const assets: TestAsset[] = [
      { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
    ];

    const originalOrder = assets.map((a) => a.id);
    sortAssetsByPriority(assets);
    expect(assets.map((a) => a.id)).toEqual(originalOrder);
  });

  it('should handle empty array', () => {
    const sorted = sortAssetsByPriority([]);
    expect(sorted).toHaveLength(0);
  });

  it('should handle null lastUpdated', () => {
    const assets: TestAsset[] = [
      { id: '1', lastUpdated: new Date() },
      { id: '2', lastUpdated: null },
    ];

    const sorted = sortAssetsByPriority(assets);
    if (sorted[0]) {
      expect(sorted[0].id).toBe('2'); // null is high priority
    }
  });
});

describe('filterAssetsNeedingUpdate', () => {
  interface TestAsset {
    id: string;
    lastUpdated: Date | null;
  }

  it('should filter assets that need update', () => {
    const assets: TestAsset[] = [
      { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // none
      { id: '2', lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // low
      { id: '3', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }, // high
    ];

    const filtered = filterAssetsNeedingUpdate(assets);
    expect(filtered).toHaveLength(2);
    expect(filtered.find((a) => a.id === '1')).toBeUndefined();
    expect(filtered.find((a) => a.id === '2')).toBeDefined();
    expect(filtered.find((a) => a.id === '3')).toBeDefined();
  });

  it('should handle empty array', () => {
    const filtered = filterAssetsNeedingUpdate([]);
    expect(filtered).toHaveLength(0);
  });
});

describe('getAssetsByPriority', () => {
  interface TestAsset {
    id: string;
    lastUpdated: Date | null;
  }

  it('should filter assets by priority level', () => {
    const assets: TestAsset[] = [
      { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // none
      { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }, // high
      { id: '3', lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }, // medium
      { id: '4', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }, // high
    ];

    const highPriority = getAssetsByPriority(assets, 'high');
    expect(highPriority).toHaveLength(2);
    expect(highPriority.every((a) => a.id === '2' || a.id === '4')).toBe(true);

    const mediumPriority = getAssetsByPriority(assets, 'medium');
    expect(mediumPriority).toHaveLength(1);
    if (mediumPriority[0]) {
      expect(mediumPriority[0].id).toBe('3');
    }
  });
});

describe('countAssetsByPriority', () => {
  interface TestAsset {
    id: string;
    lastUpdated: Date | null;
  }

  it('should count assets by priority level', () => {
    const assets: TestAsset[] = [
      { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // none
      { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }, // high
      { id: '3', lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }, // medium
      { id: '4', lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // low
      { id: '5', lastUpdated: null }, // high
    ];

    const counts = countAssetsByPriority(assets);
    expect(counts.high).toBe(2);
    expect(counts.medium).toBe(1);
    expect(counts.low).toBe(1);
    expect(counts.none).toBe(1);
  });

  it('should handle empty array', () => {
    const counts = countAssetsByPriority([]);
    expect(counts.high).toBe(0);
    expect(counts.medium).toBe(0);
    expect(counts.low).toBe(0);
    expect(counts.none).toBe(0);
  });
});

describe('getNextUpdateDate', () => {
  it('should return 7 days after last update', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const nextUpdate = getNextUpdateDate(tenDaysAgo);
    const daysDiff = Math.floor(
      (nextUpdate.getTime() - tenDaysAgo.getTime()) / (24 * 60 * 60 * 1000)
    );
    expect(daysDiff).toBe(7);
  });

  it('should return today for null lastUpdated', () => {
    const nextUpdate = getNextUpdateDate(null);
    const today = new Date();
    const daysDiff = Math.abs(
      Math.floor((nextUpdate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    );
    expect(daysDiff).toBe(0);
  });
});

describe('isUpdateOverdue', () => {
  it('should return true when overdue for low priority', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(tenDaysAgo, 'low')).toBe(true);
  });

  it('should return false when not overdue for low priority', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(fiveDaysAgo, 'low')).toBe(false);
  });

  it('should use correct threshold for each priority', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(thirtyOneDaysAgo, 'high')).toBe(true);

    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(fifteenDaysAgo, 'medium')).toBe(true);

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(tenDaysAgo, 'low')).toBe(true);
  });

  it('should return true for null lastUpdated', () => {
    expect(isUpdateOverdue(null, 'low')).toBe(true);
  });

  it('should default to low priority', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(tenDaysAgo)).toBe(true);

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(isUpdateOverdue(fiveDaysAgo)).toBe(false);
  });
});
