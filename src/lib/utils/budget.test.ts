/**
 * Budget Utils Tests
 * ==================
 * Tests for shared budget status helpers.
 */

import { describe, it, expect } from 'bun:test';
import { getBudgetStatus } from './budget';

describe('getBudgetStatus', () => {
  it('should return danger/exceeded for >= 100%', () => {
    const result = getBudgetStatus(100);
    expect(result.status).toBe('danger');
    expect(result.badgeVariant).toBe('exceeded');
    expect(result.label).toBe('Over Budget');
  });

  it('should return warning/review for >= 80% and < 100%', () => {
    const result = getBudgetStatus(80);
    expect(result.status).toBe('warning');
    expect(result.badgeVariant).toBe('review');
    expect(result.label).toBe('Near Limit');
  });

  it('should return ok/optimal for < 80%', () => {
    const result = getBudgetStatus(79.9);
    expect(result.status).toBe('ok');
    expect(result.badgeVariant).toBe('optimal');
    expect(result.label).toBe('On Track');
  });
});
