/**
 * Budget Alert Calculation Tests
 * ===============================
 * Unit tests for budget alert utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  calculateBudgetStatus,
  calculateBudgetAlert,
  calculateBudgetAlerts,
  calculateBudgetHealthSummary,
  calculateBudgetRemaining,
  calculateBudgetPercentage,
  isBudgetHealthy,
  isBudgetWarning,
  isBudgetExceeded,
  ALERT_THRESHOLDS,
} from './alerts';

describe('ALERT_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(ALERT_THRESHOLDS.WARNING).toBe(80);
    expect(ALERT_THRESHOLDS.EXCEEDED).toBe(100);
  });
});

describe('calculateBudgetStatus', () => {
  it('should return healthy for under 80%', () => {
    expect(calculateBudgetStatus('100', '0')).toBe('healthy');
    expect(calculateBudgetStatus('100', '50')).toBe('healthy');
    expect(calculateBudgetStatus('100', '79.99')).toBe('healthy');
  });

  it('should return warning for 80% to 99%', () => {
    expect(calculateBudgetStatus('100', '80')).toBe('warning');
    expect(calculateBudgetStatus('100', '85')).toBe('warning');
    expect(calculateBudgetStatus('100', '99')).toBe('warning');
    expect(calculateBudgetStatus('100', '99.99')).toBe('warning');
  });

  it('should return exceeded for 100% and above', () => {
    expect(calculateBudgetStatus('100', '100')).toBe('exceeded');
    expect(calculateBudgetStatus('100', '120')).toBe('exceeded');
    expect(calculateBudgetStatus('100', '200')).toBe('exceeded');
  });

  it('should return healthy for zero or negative budget', () => {
    expect(calculateBudgetStatus('0', '50')).toBe('healthy');
    expect(calculateBudgetStatus('-100', '50')).toBe('healthy');
  });

  it('should handle zero spent', () => {
    expect(calculateBudgetStatus('100', '0')).toBe('healthy');
  });

  it('should handle very small budgets', () => {
    expect(calculateBudgetStatus('1', '0.5')).toBe('healthy');
    expect(calculateBudgetStatus('1', '0.8')).toBe('warning');
    expect(calculateBudgetStatus('1', '1')).toBe('exceeded');
  });

  it('should handle decimal amounts', () => {
    expect(calculateBudgetStatus('100.5', '80.4')).toBe('healthy');
    expect(calculateBudgetStatus('100.5', '80.5')).toBe('warning');
    expect(calculateBudgetStatus('100.5', '100.5')).toBe('exceeded');
  });

  it('should handle budget with zero spent', () => {
    expect(calculateBudgetStatus('100', '0')).toBe('healthy');
  });
});

describe('calculateBudgetAlert', () => {
  it('should return null for healthy budgets', () => {
    expect(calculateBudgetAlert('Food', '100', '50')).toBeNull();
    expect(calculateBudgetAlert('Food', '100', '79')).toBeNull();
  });

  it('should return warning alert at 80%', () => {
    const alert = calculateBudgetAlert('Food', '100', '80');
    expect(alert).not.toBeNull();
    if (alert) {
      expect(alert.category).toBe('Food');
      expect(alert.budget).toBe('100');
      expect(alert.spent).toBe('80');
      expect(alert.percentage).toBe(80);
      expect(alert.status).toBe('warning');
      expect(alert.remaining).toBe('20');
      expect(alert.overage).toBe('0');
    }
  });

  it('should return warning alert between 80% and 99%', () => {
    const alert = calculateBudgetAlert('Transport', '100', '85');
    if (alert) {
      expect(alert.status).toBe('warning');
      expect(alert.percentage).toBe(85);
    }
  });

  it('should return exceeded alert at 100%', () => {
    const alert = calculateBudgetAlert('Entertainment', '100', '100');
    expect(alert).not.toBeNull();
    if (alert) {
      expect(alert.status).toBe('exceeded');
      expect(alert.percentage).toBe(100);
      expect(alert.remaining).toBe('0');
      expect(alert.overage).toBe('0');
    }
  });

  it('should return exceeded alert over 100%', () => {
    const alert = calculateBudgetAlert('Shopping', '100', '120');
    if (alert) {
      expect(alert.status).toBe('exceeded');
      expect(alert.percentage).toBe(120);
      expect(alert.remaining).toBe('-20');
      expect(alert.overage).toBe('20');
    }
  });

  it('should return null for zero or negative budget', () => {
    expect(calculateBudgetAlert('Food', '0', '50')).toBeNull();
    expect(calculateBudgetAlert('Food', '-100', '50')).toBeNull();
  });

  it('should round percentage to 1 decimal', () => {
    const alert = calculateBudgetAlert('Food', '100', '83.333');
    expect(alert?.percentage).toBe(83.3);
  });

  it('should handle zero spent', () => {
    expect(calculateBudgetAlert('Food', '100', '0')).toBeNull();
  });
});

describe('calculateBudgetAlerts', () => {
  const budgets = [
    { category: 'Food', budget: '100', spent: '85' },
    { category: 'Transport', budget: '50', spent: '60' },
    { category: 'Entertainment', budget: '100', spent: '50' },
    { category: 'Shopping', budget: '75', spent: '75' },
  ];

  it('should return alerts only for warning and exceeded budgets', () => {
    const alerts = calculateBudgetAlerts(budgets);
    expect(alerts).toHaveLength(3); // Food (warning), Transport (exceeded), Shopping (exceeded)
  });

  it('should sort alerts by percentage descending', () => {
    const alerts = calculateBudgetAlerts(budgets);
    if (alerts[0]) expect(alerts[0].category).toBe('Transport'); // 120%
    if (alerts[1]) expect(alerts[1].category).toBe('Shopping'); // 100%
    if (alerts[2]) expect(alerts[2].category).toBe('Food'); // 85%
  });

  it('should return empty array when no alerts', () => {
    const healthyBudgets = [
      { category: 'Food', budget: '100', spent: '50' },
      { category: 'Transport', budget: '50', spent: '20' },
    ];
    const alerts = calculateBudgetAlerts(healthyBudgets);
    expect(alerts).toHaveLength(0);
  });

  it('should handle empty input', () => {
    const alerts = calculateBudgetAlerts([]);
    expect(alerts).toHaveLength(0);
  });

  it('should skip zero budget items', () => {
    const budgets = [
      { category: 'Food', budget: '100', spent: '85' },
      { category: 'Transport', budget: '0', spent: '0' },
    ];
    const alerts = calculateBudgetAlerts(budgets);
    expect(alerts).toHaveLength(1);
    if (alerts[0]) expect(alerts[0].category).toBe('Food');
  });
});

describe('calculateBudgetHealthSummary', () => {
  it('should return healthy when no alerts', () => {
    const budgets = [
      { category: 'Food', budget: '100', spent: '50' },
      { category: 'Transport', budget: '50', spent: '20' },
    ];
    const summary = calculateBudgetHealthSummary(budgets);
    expect(summary.status).toBe('healthy');
    expect(summary.alertCount).toBe(0);
    expect(summary.warningCount).toBe(0);
    expect(summary.exceededCount).toBe(0);
  });

  it('should return warning when only warnings', () => {
    const budgets = [
      { category: 'Food', budget: '100', spent: '85' },
      { category: 'Transport', budget: '50', spent: '40' },
    ];
    const summary = calculateBudgetHealthSummary(budgets);
    expect(summary.status).toBe('warning');
    expect(summary.alertCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.exceededCount).toBe(0);
  });

  it('should return exceeded when any exceeded', () => {
    const budgets = [
      { category: 'Food', budget: '100', spent: '50' },
      { category: 'Transport', budget: '50', spent: '60' },
    ];
    const summary = calculateBudgetHealthSummary(budgets);
    expect(summary.status).toBe('exceeded');
    expect(summary.alertCount).toBe(1);
    expect(summary.warningCount).toBe(0);
    expect(summary.exceededCount).toBe(1);
  });

  it('should count multiple warnings and exceeded', () => {
    const budgets = [
      { category: 'Food', budget: '100', spent: '85' },
      { category: 'Transport', budget: '50', spent: '60' },
      { category: 'Entertainment', budget: '100', spent: '90' },
    ];
    const summary = calculateBudgetHealthSummary(budgets);
    expect(summary.status).toBe('exceeded');
    expect(summary.alertCount).toBe(3);
    expect(summary.warningCount).toBe(2);
    expect(summary.exceededCount).toBe(1);
  });

  it('should handle empty input', () => {
    const summary = calculateBudgetHealthSummary([]);
    expect(summary.status).toBe('healthy');
    expect(summary.alertCount).toBe(0);
    expect(summary.warningCount).toBe(0);
    expect(summary.exceededCount).toBe(0);
  });
});

describe('calculateBudgetRemaining', () => {
  it('should calculate remaining amount correctly', () => {
    expect(calculateBudgetRemaining('100', '50')).toBe('50');
    expect(calculateBudgetRemaining('100', '0')).toBe('100');
    expect(calculateBudgetRemaining('100', '100')).toBe('0');
    expect(calculateBudgetRemaining('100', '120')).toBe('-20');
  });

  it('should handle negative budget', () => {
    expect(calculateBudgetRemaining('-100', '50')).toBe('-150');
  });
});

describe('calculateBudgetPercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculateBudgetPercentage('100', '0')).toBe(0);
    expect(calculateBudgetPercentage('100', '50')).toBe(50);
    expect(calculateBudgetPercentage('100', '80')).toBe(80);
    expect(calculateBudgetPercentage('100', '100')).toBe(100);
    expect(calculateBudgetPercentage('100', '120')).toBe(120);
  });

  it('should round to 1 decimal', () => {
    expect(calculateBudgetPercentage('100', '33.333')).toBe(33.3);
    expect(calculateBudgetPercentage('100', '66.666')).toBe(66.7);
  });

  it('should return 0 for zero or negative budget', () => {
    expect(calculateBudgetPercentage('0', '50')).toBe(0);
    expect(calculateBudgetPercentage('-100', '50')).toBe(0);
  });
});

describe('isBudgetHealthy', () => {
  it('should return true for healthy budgets', () => {
    expect(isBudgetHealthy('100', '0')).toBe(true);
    expect(isBudgetHealthy('100', '50')).toBe(true);
    expect(isBudgetHealthy('100', '79')).toBe(true);
  });

  it('should return false for warning and exceeded', () => {
    expect(isBudgetHealthy('100', '80')).toBe(false);
    expect(isBudgetHealthy('100', '100')).toBe(false);
    expect(isBudgetHealthy('100', '120')).toBe(false);
  });
});

describe('isBudgetWarning', () => {
  it('should return true for warning budgets', () => {
    expect(isBudgetWarning('100', '80')).toBe(true);
    expect(isBudgetWarning('100', '85')).toBe(true);
    expect(isBudgetWarning('100', '99')).toBe(true);
  });

  it('should return false for healthy and exceeded', () => {
    expect(isBudgetWarning('100', '50')).toBe(false);
    expect(isBudgetWarning('100', '100')).toBe(false);
    expect(isBudgetWarning('100', '120')).toBe(false);
  });
});

describe('isBudgetExceeded', () => {
  it('should return true for exceeded budgets', () => {
    expect(isBudgetExceeded('100', '100')).toBe(true);
    expect(isBudgetExceeded('100', '120')).toBe(true);
    expect(isBudgetExceeded('100', '200')).toBe(true);
  });

  it('should return false for healthy and warning', () => {
    expect(isBudgetExceeded('100', '50')).toBe(false);
    expect(isBudgetExceeded('100', '85')).toBe(false);
    expect(isBudgetExceeded('100', '99')).toBe(false);
  });
});
