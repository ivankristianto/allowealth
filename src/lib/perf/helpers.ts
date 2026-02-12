/**
 * Performance Tracking Helpers
 *
 * Utility functions to wrap async operations and automatically
 * record their timing to the PerfCollector.
 *
 * @module perf/helpers
 */

import type { PerfCollector } from './collector';

/**
 * Wrap an async database operation and record its timing
 *
 * Automatically measures the duration of the operation and records
 * it to the PerfCollector if one is provided.
 *
 * @param name - Query identifier (e.g., 'findCategories', 'insertTransaction')
 * @param perf - PerfCollector instance (nullable for cases where perf is optional)
 * @param fn - Async function to execute and time
 * @returns The result of the async function
 *
 * @example
 * ```typescript
 * const categories = await trackQuery('findCategories', perf, async () => {
 *   return db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId));
 * });
 * ```
 */
export async function trackQuery<T>(
  name: string,
  perf: PerfCollector | null | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!perf) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    perf.recordDbQuery(name, duration);
  }
}

/**
 * Wrap an async service operation and record its timing
 *
 * Automatically measures the duration of the operation and records
 * it to the PerfCollector if one is provided.
 *
 * @param name - Service operation name (e.g., 'CategoryService.findAll', 'TransactionService.create')
 * @param perf - PerfCollector instance (nullable for cases where perf is optional)
 * @param fn - Async function to execute and time
 * @returns The result of the async function
 *
 * @example
 * ```typescript
 * const result = await trackService('CategoryService.findAll', perf, async () => {
 *   return categoryService.findAll(workspaceId);
 * });
 * ```
 */
export async function trackService<T>(
  name: string,
  perf: PerfCollector | null | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!perf) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    perf.recordService(name, duration);
  }
}

/**
 * Wrap a synchronous operation and record its timing as a DB query
 *
 * Useful for synchronous database operations that don't use async/await.
 *
 * @param name - Query identifier
 * @param perf - PerfCollector instance (nullable)
 * @param fn - Synchronous function to execute and time
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const count = trackQuerySync('countUsers', perf, () => {
 *   return db.prepare('SELECT COUNT(*) FROM users').get();
 * });
 * ```
 */
export function trackQuerySync<T>(
  name: string,
  perf: PerfCollector | null | undefined,
  fn: () => T
): T {
  if (!perf) {
    return fn();
  }

  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    perf.recordDbQuery(name, duration);
  }
}

/**
 * Wrap an async page-level processing phase and record its timing.
 * Use for non-DB, non-service CPU work like data transforms,
 * serialization, or complex computations.
 *
 * @param name - Phase identifier (e.g., 'extractAvailableMonths', 'buildSsrData')
 * @param perf - PerfCollector instance (nullable)
 * @param fn - Async function to execute and time
 * @returns The result of the async function
 *
 * @example
 * ```typescript
 * const months = await trackPhase('extractAvailableMonths', perf, async () => {
 *   return extractAvailableMonths(allTransactions);
 * });
 * ```
 */
export async function trackPhase<T>(
  name: string,
  perf: PerfCollector | null | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!perf) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    perf.recordPhase(name, duration);
  }
}

/**
 * Wrap a synchronous page-level processing phase and record its timing.
 * Use for non-DB, non-service CPU work like data transforms,
 * serialization, or complex computations.
 *
 * @param name - Phase identifier (e.g., 'transformTransactions', 'JSON.stringify')
 * @param perf - PerfCollector instance (nullable)
 * @param fn - Synchronous function to execute and time
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const transformed = trackPhaseSync('transformTransactions', perf, () => {
 *   return rawTransactions.map(transformTransaction);
 * });
 * ```
 */
export function trackPhaseSync<T>(
  name: string,
  perf: PerfCollector | null | undefined,
  fn: () => T
): T {
  if (!perf) {
    return fn();
  }

  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    perf.recordPhase(name, duration);
  }
}

/**
 * Wrap a synchronous service operation and record its timing
 *
 * Useful for synchronous service operations.
 *
 * @param name - Service operation name
 * @param perf - PerfCollector instance (nullable)
 * @param fn - Synchronous function to execute and time
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const formatted = trackServiceSync('FormatService.format', perf, () => {
 *   return formatService.formatCurrency(amount);
 * });
 * ```
 */
export function trackServiceSync<T>(
  name: string,
  perf: PerfCollector | null | undefined,
  fn: () => T
): T {
  if (!perf) {
    return fn();
  }

  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    perf.recordService(name, duration);
  }
}
