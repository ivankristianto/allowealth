/**
 * Performance Tracking Module
 *
 * Provides tools for collecting and reporting performance metrics
 * during request processing. Use in development to debug slow pages
 * and identify performance bottlenecks.
 *
 * @module perf
 *
 * @example
 * ```typescript
 * import { PerfCollector, trackQuery, trackService } from '@/lib/perf';
 *
 * // Create collector in middleware
 * const perf = new PerfCollector();
 * perf.setRoute('/transactions');
 *
 * // Track database queries
 * const categories = await trackQuery('findCategories', perf, async () => {
 *   return db.select().from(categoriesTable);
 * });
 *
 * // Track service operations
 * const result = await trackService('CategoryService.findAll', perf, async () => {
 *   return categoryService.findAll(workspaceId);
 * });
 *
 * // Track cache hits/misses
 * perf.cacheHit();
 * perf.cacheMiss();
 *
 * // Output debug comment at end of page
 * const debugComment = perf.toHtmlComment();
 * ```
 */

export { PerfCollector } from './collector';
export type { TimedOperation } from './collector';
export {
  trackQuery,
  trackService,
  trackQuerySync,
  trackServiceSync,
  trackPhase,
  trackPhaseSync,
} from './helpers';
