/**
 * Performance Helpers Tests
 *
 * Tests for the timing helper functions including:
 * - trackQuery for async DB operations
 * - trackService for async service operations
 * - trackQuerySync for sync DB operations
 * - trackServiceSync for sync service operations
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PerfCollector } from './collector';
import { trackQuery, trackService, trackQuerySync, trackServiceSync } from './helpers';

describe('helpers', () => {
  let perf: PerfCollector;

  beforeEach(() => {
    perf = new PerfCollector();
  });

  describe('trackQuery', () => {
    test('executes async function and returns result', async () => {
      const result = await trackQuery('testQuery', perf, async () => {
        return { data: 'test' };
      });

      expect(result).toEqual({ data: 'test' });
    });

    test('records query timing', async () => {
      await trackQuery('slowQuery', perf, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      });

      const queries = perf.getDbQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe('slowQuery');
      expect(queries[0].durationMs).toBeGreaterThan(0);
    });

    test('handles null perf gracefully', async () => {
      const result = await trackQuery('testQuery', null, async () => {
        return 'result';
      });

      expect(result).toBe('result');
    });

    test('handles undefined perf gracefully', async () => {
      const result = await trackQuery('testQuery', undefined, async () => {
        return 'result';
      });

      expect(result).toBe('result');
    });

    test('propagates errors', async () => {
      const error = new Error('Query failed');

      await expect(
        trackQuery('failingQuery', perf, async () => {
          throw error;
        })
      ).rejects.toThrow('Query failed');
    });

    test('records timing even when error thrown', async () => {
      try {
        await trackQuery('failingQuery', perf, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error('Query failed');
        });
      } catch {
        // Expected error
      }

      const queries = perf.getDbQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe('failingQuery');
    });

    test('tracks multiple queries', async () => {
      await trackQuery('query1', perf, async () => 'a');
      await trackQuery('query2', perf, async () => 'b');
      await trackQuery('query3', perf, async () => 'c');

      const queries = perf.getDbQueries();
      expect(queries).toHaveLength(3);
      expect(queries.map((q) => q.name)).toEqual(['query1', 'query2', 'query3']);
    });
  });

  describe('trackService', () => {
    test('executes async function and returns result', async () => {
      const result = await trackService('TestService.method', perf, async () => {
        return { success: true };
      });

      expect(result).toEqual({ success: true });
    });

    test('records service timing', async () => {
      await trackService('SlowService.process', perf, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      });

      const services = perf.getServices();
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('SlowService.process');
      expect(services[0].durationMs).toBeGreaterThan(0);
    });

    test('handles null perf gracefully', async () => {
      const result = await trackService('TestService', null, async () => {
        return 'result';
      });

      expect(result).toBe('result');
    });

    test('handles undefined perf gracefully', async () => {
      const result = await trackService('TestService', undefined, async () => {
        return 'result';
      });

      expect(result).toBe('result');
    });

    test('propagates errors', async () => {
      await expect(
        trackService('FailingService', perf, async () => {
          throw new Error('Service failed');
        })
      ).rejects.toThrow('Service failed');
    });

    test('records timing even when error thrown', async () => {
      try {
        await trackService('FailingService', perf, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error('Service failed');
        });
      } catch {
        // Expected error
      }

      const services = perf.getServices();
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('FailingService');
    });
  });

  describe('trackQuerySync', () => {
    test('executes sync function and returns result', () => {
      const result = trackQuerySync('syncQuery', perf, () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    test('records query timing', () => {
      // Do some computation to ensure measurable time
      trackQuerySync('computeQuery', perf, () => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        return sum;
      });

      const queries = perf.getDbQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe('computeQuery');
      expect(queries[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    test('handles null perf gracefully', () => {
      const result = trackQuerySync('testQuery', null, () => 'result');
      expect(result).toBe('result');
    });

    test('handles undefined perf gracefully', () => {
      const result = trackQuerySync('testQuery', undefined, () => 'result');
      expect(result).toBe('result');
    });

    test('propagates errors', () => {
      expect(() =>
        trackQuerySync('failingQuery', perf, () => {
          throw new Error('Sync query failed');
        })
      ).toThrow('Sync query failed');
    });

    test('records timing even when error thrown', () => {
      try {
        trackQuerySync('failingQuery', perf, () => {
          throw new Error('Sync query failed');
        });
      } catch {
        // Expected error
      }

      const queries = perf.getDbQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe('failingQuery');
    });
  });

  describe('trackServiceSync', () => {
    test('executes sync function and returns result', () => {
      const result = trackServiceSync('SyncService', perf, () => {
        return { formatted: 'value' };
      });

      expect(result).toEqual({ formatted: 'value' });
    });

    test('records service timing', () => {
      trackServiceSync('ComputeService', perf, () => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        return sum;
      });

      const services = perf.getServices();
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('ComputeService');
      expect(services[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    test('handles null perf gracefully', () => {
      const result = trackServiceSync('TestService', null, () => 'result');
      expect(result).toBe('result');
    });

    test('handles undefined perf gracefully', () => {
      const result = trackServiceSync('TestService', undefined, () => 'result');
      expect(result).toBe('result');
    });

    test('propagates errors', () => {
      expect(() =>
        trackServiceSync('FailingService', perf, () => {
          throw new Error('Sync service failed');
        })
      ).toThrow('Sync service failed');
    });

    test('records timing even when error thrown', () => {
      try {
        trackServiceSync('FailingService', perf, () => {
          throw new Error('Sync service failed');
        });
      } catch {
        // Expected error
      }

      const services = perf.getServices();
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('FailingService');
    });
  });

  describe('integration', () => {
    test('tracks mixed queries and services', async () => {
      // Simulate realistic usage
      await trackQuery('findUser', perf, async () => ({ id: '1', name: 'John' }));
      await trackService('AuthService.validate', perf, async () => true);
      await trackQuery('findCategories', perf, async () => [{ id: 'c1' }, { id: 'c2' }]);
      await trackService('CategoryService.format', perf, async () => ['Food', 'Transport']);

      expect(perf.getDbQueries()).toHaveLength(2);
      expect(perf.getServices()).toHaveLength(2);
    });

    test('works with PerfCollector toHtmlComment', async () => {
      perf.setRoute('/test');
      await trackQuery('testQuery', perf, async () => 'data');
      await trackService('TestService', perf, async () => 'result');

      const output = perf.toHtmlComment();
      expect(output).toContain('Route: /test');
      expect(output).toContain('DB: 1 queries');
      expect(output).toContain('Services: TestService');
    });
  });
});
