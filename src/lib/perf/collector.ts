/**
 * Performance Collector
 *
 * Collects performance metrics during a request lifecycle.
 * Created per-request in middleware and passed through Astro.locals.
 * Outputs an HTML comment with debug timing information at the end of the page.
 *
 * Features:
 * - Cache hit/miss tracking
 * - Database query timing
 * - Service operation timing
 * - Memory usage reporting
 * - Total request timing
 *
 * @module perf/collector
 */

/**
 * Represents a single timed operation
 */
export interface TimedOperation {
  name: string;
  durationMs: number;
}

/**
 * Performance Collector class
 *
 * Collects and formats performance metrics for debugging.
 * Create one instance per request and pass it through the request context.
 *
 * @example
 * ```typescript
 * // In middleware
 * const perf = new PerfCollector();
 * context.locals.perf = perf;
 *
 * // In services
 * perf.recordDbQuery('findUsers', 12);
 * perf.cacheHit();
 *
 * // In layout (before closing </html>)
 * const perfComment = perf.toHtmlComment();
 * ```
 */
export class PerfCollector {
  private startTime: number;
  private route: string = '';
  private dialect: string = '';
  private cacheDriver: string = '';
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private dbQueries: TimedOperation[] = [];
  private services: TimedOperation[] = [];
  private phases: TimedOperation[] = [];
  private milestones: TimedOperation[] = [];
  private renderStartTime: number | null = null;
  private renderEndTime: number | null = null;
  private runtime: 'workers' | 'bun' | 'node' | '' = '';

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Record a cache hit
   */
  cacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  cacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record a database query with its duration
   *
   * @param name - Query identifier (e.g., 'findCategories', 'insertTransaction')
   * @param durationMs - Query duration in milliseconds
   */
  recordDbQuery(name: string, durationMs: number): void {
    this.dbQueries.push({ name, durationMs });
  }

  /**
   * Record a service operation with its duration
   *
   * @param name - Service name (e.g., 'CategoryService', 'TransactionService.create')
   * @param durationMs - Operation duration in milliseconds
   */
  recordService(name: string, durationMs: number): void {
    this.services.push({ name, durationMs });
  }

  /**
   * Record a page-level processing phase with its duration.
   * Use for non-DB, non-service CPU work like data transforms,
   * serialization, or template rendering.
   *
   * @param name - Phase identifier (e.g., 'extractAvailableMonths', 'JSON.stringify')
   * @param durationMs - Phase duration in milliseconds
   */
  recordPhase(name: string, durationMs: number): void {
    this.phases.push({ name, durationMs });
  }

  private isCounterPhase(name: string): boolean {
    return /(?:accountCount|chunkCount|historyRowsFetched)$/.test(name);
  }

  /**
   * Get all recorded processing phases
   */
  getPhases(): readonly TimedOperation[] {
    return this.phases;
  }

  /**
   * Get total duration of all recorded phases
   */
  getTotalPhaseTime(): number {
    return this.phases.reduce((sum, phase) => {
      return this.isCounterPhase(phase.name) ? sum : sum + phase.durationMs;
    }, 0);
  }

  /**
   * Record a milestone — a named elapsed timestamp relative to collector creation.
   * Unlike phases (which are durations), milestones mark points in time.
   * They are displayed separately and NOT included in CPU phase totals.
   *
   * @param name - Milestone identifier (e.g., 'middleware.elapsed', 'preRender.elapsed')
   */
  recordMilestone(name: string): void {
    this.milestones.push({ name, durationMs: this.getTotalTime() });
  }

  /**
   * Get all recorded milestones
   */
  getMilestones(): readonly TimedOperation[] {
    return this.milestones;
  }

  /**
   * Set the route being processed
   *
   * @param route - Route path (e.g., '/transactions', '/budget')
   */
  setRoute(route: string): void {
    this.route = route;
  }

  /**
   * Set the database dialect (e.g., 'sqlite', 'postgresql')
   */
  setDialect(dialect: string): void {
    this.dialect = dialect;
  }

  /**
   * Get the database dialect
   */
  getDialect(): string {
    return this.dialect;
  }

  /**
   * Set the cache driver being used
   *
   * @param driver - Cache driver name (e.g., 'memory', 'upstash', 'noop')
   */
  setCacheDriver(driver: string): void {
    this.cacheDriver = driver;
  }

  /**
   * Mark the start of rendering phase
   */
  startRender(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * Mark the end of rendering phase
   */
  endRender(): void {
    this.renderEndTime = performance.now();
  }

  /**
   * Get the total number of cache hits
   */
  getCacheHits(): number {
    return this.cacheHits;
  }

  /**
   * Get the total number of cache misses
   */
  getCacheMisses(): number {
    return this.cacheMisses;
  }

  /**
   * Get all recorded database queries
   */
  getDbQueries(): readonly TimedOperation[] {
    return this.dbQueries;
  }

  /**
   * Get all recorded service operations
   */
  getServices(): readonly TimedOperation[] {
    return this.services;
  }

  /**
   * Get the route
   */
  getRoute(): string {
    return this.route;
  }

  /**
   * Get the cache driver name
   */
  getCacheDriver(): string {
    return this.cacheDriver;
  }

  /**
   * Set the runtime environment
   */
  setRuntime(runtime: 'workers' | 'bun' | 'node' | ''): void {
    this.runtime = runtime;
  }

  /**
   * Get the runtime environment
   */
  getRuntime(): string {
    return this.runtime;
  }

  /**
   * Get estimated CPU time in milliseconds.
   * For bun/node: wall-clock time minus DB I/O wait time.
   * For workers: total time (performance.now() already measures CPU time).
   */
  getEstimatedCpuTime(): number {
    const total = this.getTotalTime();
    if (this.runtime === 'workers') {
      return total;
    }
    return Math.max(0, total - this.getTotalDbTime());
  }

  /**
   * Get estimated I/O wait time in milliseconds.
   * For bun/node: total DB query time.
   * For workers: 0 (CPU-time clock doesn't include I/O wait).
   */
  getIoWaitTime(): number {
    if (this.runtime === 'workers') {
      return 0;
    }
    return this.getTotalDbTime();
  }

  /**
   * Get total duration of all DB queries
   */
  getTotalDbTime(): number {
    return this.dbQueries.reduce((sum, q) => sum + q.durationMs, 0);
  }

  /**
   * Get render duration in milliseconds
   */
  getRenderTime(): number | null {
    if (this.renderStartTime === null || this.renderEndTime === null) {
      return null;
    }
    return this.renderEndTime - this.renderStartTime;
  }

  /**
   * Get total elapsed time since collector creation
   */
  getTotalTime(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Format the timestamp for the debug output
   */
  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Get memory usage in megabytes
   * Returns null if memory info is not available (e.g., Workers polyfills
   * process.memoryUsage but returns zeros)
   */
  private getMemoryUsage(): number | null {
    if (this.runtime === 'workers') {
      return null;
    }
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      if (usage.heapUsed === 0) return null;
      return Math.round((usage.heapUsed / 1024 / 1024) * 10) / 10;
    }
    return null;
  }

  /**
   * Format a duration with appropriate precision
   */
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return '<1ms';
    }
    return `${Math.round(ms)}ms`;
  }

  /**
   * Sanitize a string for safe inclusion in an HTML comment.
   * Prevents comment-breaking sequences like "-->" or "--" from
   * prematurely closing the comment or injecting markup.
   *
   * @param value - The untrusted string to sanitize
   * @returns A sanitized string safe for HTML comment inclusion
   */
  private sanitizeCommentField(value: string): string {
    return value
      .replace(/-->/g, '==>') // Prevent comment close
      .replace(/--/g, '- -') // Break double-dash sequences
      .replace(/</g, '&lt;') // Prevent tag injection
      .replace(/>/g, '&gt;'); // Prevent any remaining close sequences
  }

  /**
   * Generate an HTML comment with all collected performance metrics
   *
   * Output format:
   * ```
   * <!--
   * [PERF DEBUG] 2025-02-03 14:32:05
   * Route: /transactions
   * Cache: 3 hits, 1 miss
   * DB: 4 queries in 23ms
   *   - findCategories: 8ms
   *   - findTransactions: 12ms
   * Services: CategoryService 10ms
   * Render: 67ms
   * Memory: 48.2 MB
   * Total: 112ms
   * -->
   * ```
   *
   * @returns HTML comment string with performance metrics
   */
  toHtmlComment(): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(`[PERF DEBUG] ${this.formatTimestamp()}`);

    // Route (sanitized - comes from URL pathname)
    if (this.route) {
      lines.push(`Route: ${this.sanitizeCommentField(this.route)}`);
    }

    // Database dialect
    if (this.dialect) {
      lines.push(`Dialect: ${this.sanitizeCommentField(this.dialect)}`);
    }

    // Cache stats (driver name sanitized - comes from config)
    const cacheTotal = this.cacheHits + this.cacheMisses;
    if (cacheTotal > 0 || this.cacheDriver) {
      const hitLabel = this.cacheHits === 1 ? 'hit' : 'hits';
      const missLabel = this.cacheMisses === 1 ? 'miss' : 'misses';
      const driverSuffix = this.cacheDriver
        ? ` (${this.sanitizeCommentField(this.cacheDriver)})`
        : '';
      lines.push(
        `Cache${driverSuffix}: ${this.cacheHits} ${hitLabel}, ${this.cacheMisses} ${missLabel}`
      );
    }

    // DB queries (names sanitized - come from service code)
    if (this.dbQueries.length > 0) {
      const totalDbTime = this.getTotalDbTime();
      const queryLabel = this.dbQueries.length === 1 ? 'query' : 'queries';
      lines.push(
        `DB: ${this.dbQueries.length} ${queryLabel} in ${this.formatDuration(totalDbTime)}`
      );
      for (const query of this.dbQueries) {
        lines.push(
          `  - ${this.sanitizeCommentField(query.name)}: ${this.formatDuration(query.durationMs)}`
        );
      }
    }

    // Services (names sanitized - come from service code)
    if (this.services.length > 0) {
      const serviceParts = this.services.map(
        (s) => `${this.sanitizeCommentField(s.name)} ${this.formatDuration(s.durationMs)}`
      );
      lines.push(`Services: ${serviceParts.join(', ')}`);
    }

    // Phases (page-level processing)
    if (this.phases.length > 0) {
      const totalPhaseTime = this.getTotalPhaseTime();
      const phaseLabel = this.phases.length === 1 ? 'phase' : 'phases';
      lines.push(
        `Phases: ${this.phases.length} ${phaseLabel} in ${this.formatDuration(totalPhaseTime)}`
      );
      for (const phase of this.phases) {
        const formattedValue = this.isCounterPhase(phase.name)
          ? `${Math.round(phase.durationMs)}`
          : this.formatDuration(phase.durationMs);
        lines.push(`  - ${this.sanitizeCommentField(phase.name)}: ${formattedValue}`);
      }
    }

    // Milestones (elapsed timestamps, not durations — excluded from CPU totals)
    if (this.milestones.length > 0) {
      lines.push(`Milestones:`);
      for (const ms of this.milestones) {
        lines.push(
          `  @ ${this.sanitizeCommentField(ms.name)}: ${this.formatDuration(ms.durationMs)}`
        );
      }
    }

    // Render time
    const renderTime = this.getRenderTime();
    if (renderTime !== null) {
      lines.push(`Render: ${this.formatDuration(renderTime)}`);
    }

    // Memory usage
    const memoryMb = this.getMemoryUsage();
    if (memoryMb !== null) {
      lines.push(`Memory: ${memoryMb} MB`);
    }

    // Total time + CPU breakdown
    const totalTime = this.getTotalTime();
    if (this.runtime === 'workers') {
      lines.push(`Total: ${this.formatDuration(totalTime)} (CPU time)`);
      lines.push(`Runtime: workers (CPU-time clock)`);
    } else if (this.runtime) {
      const cpuTime = this.getEstimatedCpuTime();
      const ioTime = this.getIoWaitTime();
      const trackedCpu = this.getTotalPhaseTime();
      const untrackedCpu = Math.max(0, cpuTime - trackedCpu);
      lines.push(`Total: ${this.formatDuration(totalTime)} (wall-clock)`);
      lines.push(
        `CPU: ~${this.formatDuration(cpuTime)} | I/O Wait: ~${this.formatDuration(ioTime)} (DB queries)`
      );
      if (trackedCpu > 0) {
        lines.push(
          `CPU breakdown: ${this.formatDuration(trackedCpu)} tracked, ~${this.formatDuration(untrackedCpu)} untracked (SSR, imports, middleware)`
        );
      }
      lines.push(`Runtime: ${this.runtime}`);
    } else {
      lines.push(`Total: ${this.formatDuration(totalTime)}`);
    }

    lines.push('');

    return `<!--\n${lines.join('\n')}\n-->`;
  }
}
