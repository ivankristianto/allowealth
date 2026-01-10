/**
 * Asset Priority Calculation
 * ==========================
 * Provides utilities for calculating asset update priority based on last updated date.
 */

/**
 * Asset priority levels
 */
export type AssetPriority = 'high' | 'medium' | 'low' | 'none';

/**
 * Priority thresholds in days
 */
export const PRIORITY_THRESHOLDS = {
  HIGH: 30, // >30 days since update
  MEDIUM: 14, // >14 days since update
  LOW: 7, // >7 days since update
} as const;

/**
 * Priority result with details
 */
export interface PriorityResult {
  priority: AssetPriority;
  daysSinceUpdate: number;
  needsUpdate: boolean;
  lastUpdated: Date | null;
}

/**
 * Calculate asset priority based on last updated date
 *
 * @param lastUpdated - Last updated date (null if never updated)
 * @returns Priority result with priority level, days since update, and update flag
 *
 * @example
 * calculateAssetPriority(new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)) // 35 days ago
 * // Returns { priority: 'high', daysSinceUpdate: 35, needsUpdate: true, lastUpdated: Date }
 *
 * calculateAssetPriority(new Date()) // Today
 * // Returns { priority: 'none', daysSinceUpdate: 0, needsUpdate: false, lastUpdated: Date }
 */
export function calculateAssetPriority(lastUpdated: Date | null | undefined): PriorityResult {
  // Handle null or undefined lastUpdated
  if (!lastUpdated) {
    // Treat never-updated assets as high priority
    return {
      priority: 'high',
      daysSinceUpdate: Number.MAX_SAFE_INTEGER,
      needsUpdate: true,
      lastUpdated: null,
    };
  }

  // Calculate days since update
  const now = new Date();
  const daysSinceUpdate = Math.floor(
    (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine priority based on thresholds
  let priority: AssetPriority;
  if (daysSinceUpdate > PRIORITY_THRESHOLDS.HIGH) {
    priority = 'high';
  } else if (daysSinceUpdate > PRIORITY_THRESHOLDS.MEDIUM) {
    priority = 'medium';
  } else if (daysSinceUpdate > PRIORITY_THRESHOLDS.LOW) {
    priority = 'low';
  } else {
    priority = 'none';
  }

  // Assets need update if priority is not 'none'
  const needsUpdate = priority !== 'none';

  return {
    priority,
    daysSinceUpdate,
    needsUpdate,
    lastUpdated,
  };
}

/**
 * Check if asset needs update based on last updated date
 *
 * @param lastUpdated - Last updated date (null if never updated)
 * @returns True if asset needs update (>7 days since update)
 *
 * @example
 * needsAssetUpdate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)) // 10 days ago
 * // Returns true
 *
 * needsAssetUpdate(new Date()) // Today
 * // Returns false
 */
export function needsAssetUpdate(lastUpdated: Date | null | undefined): boolean {
  return calculateAssetPriority(lastUpdated).needsUpdate;
}

/**
 * Calculate days since update
 *
 * @param lastUpdated - Last updated date (null if never updated)
 * @returns Days since update (Number.MAX_SAFE_INTEGER if never updated)
 *
 * @example
 * getDaysSinceUpdate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))
 * // Returns 10
 */
export function getDaysSinceUpdate(lastUpdated: Date | null | undefined): number {
  return calculateAssetPriority(lastUpdated).daysSinceUpdate;
}

/**
 * Get priority level as number (for sorting)
 *
 * @param priority - Priority level
 * @returns Numeric priority (higher = more urgent)
 *
 * @example
 * getPriorityValue('high') // Returns 4
 * getPriorityValue('medium') // Returns 3
 * getPriorityValue('low') // Returns 2
 * getPriorityValue('none') // Returns 1
 */
export function getPriorityValue(priority: AssetPriority): number {
  switch (priority) {
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    case 'none':
      return 1;
  }
}

/**
 * Sort assets by priority (highest priority first)
 *
 * @param assets - Array of assets with lastUpdated dates
 * @returns Sorted array (highest priority first)
 *
 * @example
 * const assets = [
 *   { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
 *   { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
 * ];
 * sortAssetsByPriority(assets)
 * // Returns assets sorted with id: '2' first (high priority)
 */
export function sortAssetsByPriority<T extends { lastUpdated: Date | null }>(assets: T[]): T[] {
  return [...assets].sort((a, b) => {
    const priorityA = getPriorityValue(calculateAssetPriority(a.lastUpdated).priority);
    const priorityB = getPriorityValue(calculateAssetPriority(b.lastUpdated).priority);
    return priorityB - priorityA; // Descending order (highest priority first)
  });
}

/**
 * Filter assets that need update
 *
 * @param assets - Array of assets with lastUpdated dates
 * @returns Array of assets that need update
 *
 * @example
 * const assets = [
 *   { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
 *   { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
 * ];
 * filterAssetsNeedingUpdate(assets)
 * // Returns only asset with id: '2'
 */
export function filterAssetsNeedingUpdate<T extends { lastUpdated: Date | null }>(
  assets: T[]
): T[] {
  return assets.filter((asset) => needsAssetUpdate(asset.lastUpdated));
}

/**
 * Get assets by priority level
 *
 * @param assets - Array of assets with lastUpdated dates
 * @param priority - Priority level to filter by
 * @returns Array of assets with specified priority
 */
export function getAssetsByPriority<T extends { lastUpdated: Date | null }>(
  assets: T[],
  priority: AssetPriority
): T[] {
  return assets.filter((asset) => calculateAssetPriority(asset.lastUpdated).priority === priority);
}

/**
 * Count assets by priority level
 *
 * @param assets - Array of assets with lastUpdated dates
 * @returns Object with count of assets by priority level
 *
 * @example
 * const assets = [
 *   { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
 *   { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
 * ];
 * countAssetsByPriority(assets)
 * // Returns { high: 1, medium: 0, low: 0, none: 1 }
 */
export function countAssetsByPriority<T extends { lastUpdated: Date | null }>(
  assets: T[]
): Record<AssetPriority, number> {
  const counts: Record<AssetPriority, number> = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };

  for (const asset of assets) {
    const priority = calculateAssetPriority(asset.lastUpdated).priority;
    counts[priority]++;
  }

  return counts;
}

/**
 * Get next update recommendation date
 *
 * @param lastUpdated - Last updated date
 * @returns Date when next update is recommended (7 days after last update)
 */
export function getNextUpdateDate(lastUpdated: Date | null): Date {
  if (!lastUpdated) {
    // If never updated, recommend updating today
    return new Date();
  }

  const nextUpdate = new Date(lastUpdated);
  nextUpdate.setDate(nextUpdate.getDate() + PRIORITY_THRESHOLDS.LOW);
  return nextUpdate;
}

/**
 * Check if update is overdue
 *
 * @param lastUpdated - Last updated date
 * @param priority - Priority level to check against (default: 'low')
 * @returns True if update is overdue based on priority threshold
 *
 * @example
 * isUpdateOverdue(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 'low') // 10 days ago
 * // Returns true (overdue for low priority threshold)
 */
export function isUpdateOverdue(
  lastUpdated: Date | null,
  priority: AssetPriority = 'low'
): boolean {
  if (!lastUpdated) {
    return true;
  }

  const result = calculateAssetPriority(lastUpdated);
  const threshold = PRIORITY_THRESHOLDS[priority.toUpperCase() as keyof typeof PRIORITY_THRESHOLDS];
  return result.daysSinceUpdate > threshold;
}
