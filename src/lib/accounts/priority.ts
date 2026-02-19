/**
 * Account Priority Calculation
 * ==========================
 * Provides utilities for calculating account update priority based on last updated date.
 */

/**
 * Account priority levels
 */
export type AccountPriority = 'high' | 'medium' | 'low' | 'none';

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
  priority: AccountPriority;
  daysSinceUpdate: number;
  needsUpdate: boolean;
  lastUpdated: Date | null;
}

/**
 * Calculate account priority based on last updated date
 *
 * @param lastUpdated - Last updated date (null if never updated)
 * @returns Priority result with priority level, days since update, and update flag
 *
 * @example
 * calculateAccountPriority(new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)) // 35 days ago
 * // Returns { priority: 'high', daysSinceUpdate: 35, needsUpdate: true, lastUpdated: Date }
 *
 * calculateAccountPriority(new Date()) // Today
 * // Returns { priority: 'none', daysSinceUpdate: 0, needsUpdate: false, lastUpdated: Date }
 */
export function calculateAccountPriority(lastUpdated: Date | null | undefined): PriorityResult {
  // Handle null or undefined lastUpdated
  if (!lastUpdated) {
    // Treat never-updated accounts as high priority
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
  let priority: AccountPriority;
  if (daysSinceUpdate > PRIORITY_THRESHOLDS.HIGH) {
    priority = 'high';
  } else if (daysSinceUpdate > PRIORITY_THRESHOLDS.MEDIUM) {
    priority = 'medium';
  } else if (daysSinceUpdate > PRIORITY_THRESHOLDS.LOW) {
    priority = 'low';
  } else {
    priority = 'none';
  }

  // Accounts need update if priority is not 'none'
  const needsUpdate = priority !== 'none';

  return {
    priority,
    daysSinceUpdate,
    needsUpdate,
    lastUpdated,
  };
}

/**
 * Check if account needs update based on last updated date
 *
 * @param lastUpdated - Last updated date (null if never updated)
 * @returns True if account needs update (>7 days since update)
 *
 * @example
 * needsAccountUpdate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)) // 10 days ago
 * // Returns true
 *
 * needsAccountUpdate(new Date()) // Today
 * // Returns false
 */
export function needsAccountUpdate(lastUpdated: Date | null | undefined): boolean {
  return calculateAccountPriority(lastUpdated).needsUpdate;
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
  return calculateAccountPriority(lastUpdated).daysSinceUpdate;
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
export function getPriorityValue(priority: AccountPriority): number {
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
 * Sort accounts by priority (highest priority first)
 *
 * @param accounts - Array of accounts with lastUpdated dates
 * @returns Sorted array (highest priority first)
 *
 * @example
 * const accounts = [
 *   { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
 *   { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
 * ];
 * sortAccountsByPriority(accounts)
 * // Returns accounts sorted with id: '2' first (high priority)
 */
export function sortAccountsByPriority<T extends { lastUpdated: Date | null }>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    const priorityA = getPriorityValue(calculateAccountPriority(a.lastUpdated).priority);
    const priorityB = getPriorityValue(calculateAccountPriority(b.lastUpdated).priority);
    return priorityB - priorityA; // Descending order (highest priority first)
  });
}

/**
 * Filter accounts that need update
 *
 * @param accounts - Array of accounts with lastUpdated dates
 * @returns Array of accounts that need update
 *
 * @example
 * const accounts = [
 *   { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
 *   { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
 * ];
 * filterAccountsNeedingUpdate(accounts)
 * // Returns only account with id: '2'
 */
export function filterAccountsNeedingUpdate<T extends { lastUpdated: Date | null }>(
  accounts: T[]
): T[] {
  return accounts.filter((account) => needsAccountUpdate(account.lastUpdated));
}

/**
 * Get accounts by priority level
 *
 * @param accounts - Array of accounts with lastUpdated dates
 * @param priority - Priority level to filter by
 * @returns Array of accounts with specified priority
 */
export function getAccountsByPriority<T extends { lastUpdated: Date | null }>(
  accounts: T[],
  priority: AccountPriority
): T[] {
  return accounts.filter(
    (account) => calculateAccountPriority(account.lastUpdated).priority === priority
  );
}

/**
 * Count accounts by priority level
 *
 * @param accounts - Array of accounts with lastUpdated dates
 * @returns Object with count of accounts by priority level
 *
 * @example
 * const accounts = [
 *   { id: '1', lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
 *   { id: '2', lastUpdated: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
 * ];
 * countAccountsByPriority(accounts)
 * // Returns { high: 1, medium: 0, low: 0, none: 1 }
 */
export function countAccountsByPriority<T extends { lastUpdated: Date | null }>(
  accounts: T[]
): Record<AccountPriority, number> {
  const counts: Record<AccountPriority, number> = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };

  for (const account of accounts) {
    const priority = calculateAccountPriority(account.lastUpdated).priority;
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
  priority: AccountPriority = 'low'
): boolean {
  if (!lastUpdated) {
    return true;
  }

  const result = calculateAccountPriority(lastUpdated);
  const threshold = PRIORITY_THRESHOLDS[priority.toUpperCase() as keyof typeof PRIORITY_THRESHOLDS];
  return result.daysSinceUpdate > threshold;
}
