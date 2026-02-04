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
});
