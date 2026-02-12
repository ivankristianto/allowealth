/**
 * PerfCollector Tests
 *
 * Tests for the performance collector class including:
 * - Cache hit/miss tracking
 * - Database query recording
 * - Service operation recording
 * - HTML comment output formatting
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PerfCollector } from './collector';

describe('PerfCollector', () => {
  let perf: PerfCollector;

  beforeEach(() => {
    perf = new PerfCollector();
  });

  describe('cache tracking', () => {
    test('starts with zero cache hits and misses', () => {
      expect(perf.getCacheHits()).toBe(0);
      expect(perf.getCacheMisses()).toBe(0);
    });

    test('tracks cache hits', () => {
      perf.cacheHit();
      perf.cacheHit();
      perf.cacheHit();

      expect(perf.getCacheHits()).toBe(3);
      expect(perf.getCacheMisses()).toBe(0);
    });

    test('tracks cache misses', () => {
      perf.cacheMiss();
      perf.cacheMiss();

      expect(perf.getCacheHits()).toBe(0);
      expect(perf.getCacheMisses()).toBe(2);
    });

    test('tracks both hits and misses', () => {
      perf.cacheHit();
      perf.cacheMiss();
      perf.cacheHit();
      perf.cacheMiss();
      perf.cacheHit();

      expect(perf.getCacheHits()).toBe(3);
      expect(perf.getCacheMisses()).toBe(2);
    });
  });

  describe('database query tracking', () => {
    test('starts with empty queries', () => {
      expect(perf.getDbQueries()).toEqual([]);
      expect(perf.getTotalDbTime()).toBe(0);
    });

    test('records database queries', () => {
      perf.recordDbQuery('findCategories', 8);
      perf.recordDbQuery('findTransactions', 12);

      const queries = perf.getDbQueries();
      expect(queries).toHaveLength(2);
      expect(queries[0]).toEqual({ name: 'findCategories', durationMs: 8 });
      expect(queries[1]).toEqual({ name: 'findTransactions', durationMs: 12 });
    });

    test('calculates total DB time', () => {
      perf.recordDbQuery('query1', 10);
      perf.recordDbQuery('query2', 15);
      perf.recordDbQuery('query3', 5);

      expect(perf.getTotalDbTime()).toBe(30);
    });

    test('handles fractional durations', () => {
      perf.recordDbQuery('fastQuery', 0.5);
      perf.recordDbQuery('anotherQuery', 1.7);

      expect(perf.getTotalDbTime()).toBeCloseTo(2.2, 5);
    });
  });

  describe('service tracking', () => {
    test('starts with empty services', () => {
      expect(perf.getServices()).toEqual([]);
    });

    test('records service operations', () => {
      perf.recordService('CategoryService', 10);
      perf.recordService('TransactionService.create', 25);

      const services = perf.getServices();
      expect(services).toHaveLength(2);
      expect(services[0]).toEqual({ name: 'CategoryService', durationMs: 10 });
      expect(services[1]).toEqual({ name: 'TransactionService.create', durationMs: 25 });
    });
  });

  describe('route tracking', () => {
    test('starts with empty route', () => {
      expect(perf.getRoute()).toBe('');
    });

    test('sets route', () => {
      perf.setRoute('/transactions');
      expect(perf.getRoute()).toBe('/transactions');
    });

    test('allows route updates', () => {
      perf.setRoute('/transactions');
      perf.setRoute('/budget');
      expect(perf.getRoute()).toBe('/budget');
    });

    test('sets dialect', () => {
      perf.setDialect('sqlite');
      expect(perf.getDialect()).toBe('sqlite');
    });

    test('includes dialect in output', () => {
      perf.setDialect('postgresql');
      const output = perf.toHtmlComment();
      expect(output).toContain('Dialect: postgresql');
    });

    test('excludes dialect when not set', () => {
      const output = perf.toHtmlComment();
      expect(output).not.toContain('Dialect:');
    });
  });

  describe('render timing', () => {
    test('returns null when render not tracked', () => {
      expect(perf.getRenderTime()).toBeNull();
    });

    test('returns null when only start tracked', () => {
      perf.startRender();
      expect(perf.getRenderTime()).toBeNull();
    });

    test('tracks render time', async () => {
      perf.startRender();
      // Small delay to ensure measurable time
      await new Promise((resolve) => setTimeout(resolve, 5));
      perf.endRender();

      const renderTime = perf.getRenderTime();
      expect(renderTime).not.toBeNull();
      expect(renderTime!).toBeGreaterThan(0);
    });
  });

  describe('total timing', () => {
    test('tracks total elapsed time', async () => {
      // Small delay to ensure measurable time
      await new Promise((resolve) => setTimeout(resolve, 5));

      const totalTime = perf.getTotalTime();
      expect(totalTime).toBeGreaterThan(0);
    });
  });

  describe('toHtmlComment', () => {
    test('outputs basic structure', () => {
      const output = perf.toHtmlComment();

      expect(output).toMatch(/^<!--/);
      expect(output).toMatch(/-->$/);
      expect(output).toContain('[PERF DEBUG]');
      expect(output).toContain('Total:');
    });

    test('includes route when set', () => {
      perf.setRoute('/transactions');
      const output = perf.toHtmlComment();

      expect(output).toContain('Route: /transactions');
    });

    test('excludes route when not set', () => {
      const output = perf.toHtmlComment();

      expect(output).not.toContain('Route:');
    });

    test('includes cache stats when present', () => {
      perf.cacheHit();
      perf.cacheHit();
      perf.cacheHit();
      perf.cacheMiss();
      const output = perf.toHtmlComment();

      expect(output).toContain('Cache: 3 hits, 1 miss');
    });

    test('excludes cache stats when none tracked', () => {
      const output = perf.toHtmlComment();

      expect(output).not.toContain('Cache:');
    });

    test('includes DB queries with details', () => {
      perf.recordDbQuery('findCategories', 8);
      perf.recordDbQuery('findTransactions', 12);
      const output = perf.toHtmlComment();

      expect(output).toContain('DB: 2 queries in 20ms');
      expect(output).toContain('- findCategories: 8ms');
      expect(output).toContain('- findTransactions: 12ms');
    });

    test('excludes DB section when no queries', () => {
      const output = perf.toHtmlComment();

      expect(output).not.toContain('DB:');
    });

    test('includes services', () => {
      perf.recordService('CategoryService', 10);
      perf.recordService('TransactionService', 15);
      const output = perf.toHtmlComment();

      expect(output).toContain('Services: CategoryService 10ms, TransactionService 15ms');
    });

    test('excludes services when none tracked', () => {
      const output = perf.toHtmlComment();

      expect(output).not.toContain('Services:');
    });

    test('includes render time when tracked', () => {
      perf.startRender();
      perf.endRender();
      const output = perf.toHtmlComment();

      // Render time can be <1ms or a number like 5ms
      expect(output).toMatch(/Render: (<1ms|\d+ms)/);
    });

    test('includes memory usage in Node.js environment', () => {
      const output = perf.toHtmlComment();

      // In Bun/Node.js, memory should be available
      expect(output).toMatch(/Memory: [\d.]+ MB/);
    });

    test('includes timestamp in ISO-like format', () => {
      const output = perf.toHtmlComment();

      // Matches: 2025-02-03 14:32:05
      expect(output).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    test('formats sub-millisecond durations', () => {
      perf.recordDbQuery('fastQuery', 0.3);
      const output = perf.toHtmlComment();

      expect(output).toContain('- fastQuery: <1ms');
    });

    test('complete output matches expected format', () => {
      perf.setRoute('/transactions');
      perf.cacheHit();
      perf.cacheHit();
      perf.cacheHit();
      perf.cacheMiss();
      perf.recordDbQuery('findCategories', 8);
      perf.recordDbQuery('findTransactions', 12);
      perf.recordService('CategoryService', 10);
      perf.startRender();
      perf.endRender();

      const output = perf.toHtmlComment();

      // Verify structure
      expect(output).toMatch(/^<!--\n/);
      expect(output).toMatch(/\n-->$/);
      expect(output).toContain('[PERF DEBUG]');
      expect(output).toContain('Route: /transactions');
      expect(output).toContain('Cache: 3 hits, 1 miss');
      expect(output).toContain('DB: 2 queries in 20ms');
      expect(output).toContain('  - findCategories: 8ms');
      expect(output).toContain('  - findTransactions: 12ms');
      expect(output).toContain('Services: CategoryService 10ms');
      expect(output).toContain('Render:');
      expect(output).toContain('Memory:');
      expect(output).toContain('Total:');
    });

    test('sanitizes comment-breaking sequences in untrusted fields', () => {
      // Inject malicious values that could break HTML comments
      perf.setRoute('/test-->injection<script>');
      perf.setCacheDriver('evil--driver');
      perf.recordDbQuery('query-->name', 5);
      perf.recordService('service--<name>', 10);

      const output = perf.toHtmlComment();

      // Should not contain unescaped comment-breaking sequences
      expect(output).not.toContain('-->injection');
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('evil--driver');
      expect(output).not.toContain('query-->name');
      expect(output).not.toContain('service--<name>');

      // Should contain sanitized versions
      expect(output).toContain('Route: /test==&gt;injection&lt;script&gt;');
      expect(output).toContain('(evil- -driver)');
      expect(output).toContain('query==&gt;name');
      expect(output).toContain('service- -&lt;name&gt;');

      // Comment structure should still be valid
      expect(output).toMatch(/^<!--\n/);
      expect(output).toMatch(/\n-->$/);
    });
  });

  describe('phase tracking', () => {
    test('starts with empty phases', () => {
      expect(perf.getPhases()).toHaveLength(0);
      expect(perf.getTotalPhaseTime()).toBe(0);
    });

    test('records a phase', () => {
      perf.recordPhase('transform', 25);
      const phases = perf.getPhases();
      expect(phases).toHaveLength(1);
      expect(phases[0].name).toBe('transform');
      expect(phases[0].durationMs).toBe(25);
    });

    test('records multiple phases', () => {
      perf.recordPhase('transform', 10);
      perf.recordPhase('extractMonths', 50);
      perf.recordPhase('monthlySummary', 30);

      expect(perf.getPhases()).toHaveLength(3);
      expect(perf.getTotalPhaseTime()).toBe(90);
    });

    test('includes phases in HTML comment', () => {
      perf.recordPhase('transform', 5);
      perf.recordPhase('extractAvailableMonths', 120);
      perf.recordPhase('monthlySummary', 80);
      const output = perf.toHtmlComment();

      expect(output).toContain('Phases: 3 phases in 205ms');
      expect(output).toContain('  - transform: 5ms');
      expect(output).toContain('  - extractAvailableMonths: 120ms');
      expect(output).toContain('  - monthlySummary: 80ms');
    });

    test('uses singular label for single phase', () => {
      perf.recordPhase('transform', 5);
      const output = perf.toHtmlComment();

      expect(output).toContain('Phases: 1 phase in 5ms');
    });

    test('excludes phases section when none tracked', () => {
      const output = perf.toHtmlComment();
      expect(output).not.toContain('Phases:');
    });

    test('includes CPU breakdown when phases and runtime are set', () => {
      perf.setRuntime('node');
      perf.recordPhase('transform', 50);
      perf.recordPhase('summary', 30);
      const output = perf.toHtmlComment();

      expect(output).toContain('CPU breakdown: 80ms tracked');
      expect(output).toContain('untracked (SSR, imports, middleware)');
    });

    test('sanitizes phase names in HTML comment', () => {
      perf.recordPhase('phase-->injection', 10);
      const output = perf.toHtmlComment();

      expect(output).not.toContain('-->injection');
      expect(output).toContain('phase==&gt;injection');
    });
  });

  describe('milestone tracking', () => {
    test('starts with empty milestones', () => {
      expect(perf.getMilestones()).toHaveLength(0);
    });

    test('records a milestone with elapsed time', () => {
      perf.recordMilestone('middleware.elapsed');
      const milestones = perf.getMilestones();
      expect(milestones).toHaveLength(1);
      expect(milestones[0].name).toBe('middleware.elapsed');
      expect(milestones[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    test('milestones are NOT included in getTotalPhaseTime', () => {
      perf.recordPhase('transform', 10);
      perf.recordMilestone('middleware.elapsed');
      expect(perf.getTotalPhaseTime()).toBe(10);
    });

    test('milestones appear in HTML comment separately from phases', () => {
      perf.recordPhase('transform', 5);
      perf.recordMilestone('middleware.elapsed');
      const output = perf.toHtmlComment();

      expect(output).toContain('Phases: 1 phase in 5ms');
      expect(output).toContain('Milestones:');
      expect(output).toContain('@ middleware.elapsed:');
    });

    test('excludes milestones section when none tracked', () => {
      const output = perf.toHtmlComment();
      expect(output).not.toContain('Milestones:');
    });
  });

  describe('runtime tracking', () => {
    test('starts with empty runtime', () => {
      expect(perf.getRuntime()).toBe('');
    });

    test('sets runtime', () => {
      perf.setRuntime('bun');
      expect(perf.getRuntime()).toBe('bun');
    });

    test('allows runtime updates', () => {
      perf.setRuntime('bun');
      perf.setRuntime('workers');
      expect(perf.getRuntime()).toBe('workers');
    });
  });

  describe('CPU time estimation', () => {
    test('bun runtime: CPU = max(0, total - DB time)', () => {
      perf.setRuntime('bun');
      perf.recordDbQuery('query1', 10);
      perf.recordDbQuery('query2', 15);

      const cpuTime = perf.getEstimatedCpuTime();
      const totalTime = perf.getTotalTime();
      const dbTime = perf.getTotalDbTime();

      expect(cpuTime).toBeCloseTo(Math.max(0, totalTime - dbTime), 0);
    });

    test('workers runtime: CPU = total (CPU-time clock)', () => {
      perf.setRuntime('workers');
      perf.recordDbQuery('query1', 10);

      const cpuTime = perf.getEstimatedCpuTime();
      const totalTime = perf.getTotalTime();

      expect(cpuTime).toBeCloseTo(totalTime, 0);
    });

    test('bun runtime: I/O wait = DB time', () => {
      perf.setRuntime('bun');
      perf.recordDbQuery('query1', 10);
      perf.recordDbQuery('query2', 15);

      expect(perf.getIoWaitTime()).toBe(25);
    });

    test('workers runtime: I/O wait = 0', () => {
      perf.setRuntime('workers');
      perf.recordDbQuery('query1', 10);

      expect(perf.getIoWaitTime()).toBe(0);
    });

    test('unset runtime: CPU = max(0, total - DB time)', () => {
      perf.recordDbQuery('query1', 10);

      const cpuTime = perf.getEstimatedCpuTime();
      const totalTime = perf.getTotalTime();

      expect(cpuTime).toBeCloseTo(Math.max(0, totalTime - 10), 0);
    });

    test('CPU time floors at 0 when parallel DB queries exceed wall-clock', () => {
      perf.setRuntime('bun');
      // Simulate concurrent queries whose summed duration exceeds wall-clock
      perf.recordDbQuery('parallel1', 50000);
      perf.recordDbQuery('parallel2', 50000);

      const cpuTime = perf.getEstimatedCpuTime();
      expect(cpuTime).toBe(0);
    });
  });

  describe('toHtmlComment with runtime', () => {
    test('bun runtime shows wall-clock and CPU breakdown', () => {
      perf.setRuntime('bun');
      perf.recordDbQuery('query1', 10);
      const output = perf.toHtmlComment();

      expect(output).toContain('(wall-clock)');
      expect(output).toContain('CPU: ~');
      expect(output).toContain('I/O Wait: ~');
      expect(output).toContain('Runtime: bun');
    });

    test('workers runtime shows CPU time', () => {
      perf.setRuntime('workers');
      const output = perf.toHtmlComment();

      expect(output).toContain('(CPU time)');
      expect(output).toContain('Runtime: workers (CPU-time clock)');
    });

    test('unset runtime shows simple total', () => {
      const output = perf.toHtmlComment();

      expect(output).toMatch(/Total: (<1ms|\d+ms)$/m);
      expect(output).not.toContain('Runtime:');
    });
  });
});
