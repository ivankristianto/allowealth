import { describe, expect, it } from 'bun:test';
import {
  buildReportUrl,
  normalizeReportState,
  readReportStateFromUrl,
  REPORT_SECTION_PATHS,
} from './report-state';

describe('report-state helpers', () => {
  describe('buildReportUrl', () => {
    it('preserves filters when switching report sections', () => {
      expect(
        buildReportUrl('/reports/income', {
          range: 'yearly',
          period: '2026',
          currency: 'USD',
          userId: 'usr_1',
        })
      ).toBe('/reports/income?range=yearly&period=2026&currency=USD&user_id=usr_1');
    });

    it('omits optional params when not provided', () => {
      expect(
        buildReportUrl('/reports', {
          range: 'monthly',
          period: '2026-02',
        })
      ).toBe('/reports?range=monthly&period=2026-02');
    });
  });

  describe('normalizeReportState', () => {
    it('normalizes mismatched periods for yearly range', () => {
      expect(
        normalizeReportState({
          range: 'yearly',
          period: '2026-02',
        }).period
      ).toBe('2026');
    });

    it('expands year-only period for monthly range', () => {
      const result = normalizeReportState({
        range: 'monthly',
        period: '2026',
      });
      expect(result.period).toMatch(/^2026-\d{2}$/);
    });

    it('passes through valid monthly period', () => {
      expect(
        normalizeReportState({
          range: 'monthly',
          period: '2026-03',
        }).period
      ).toBe('2026-03');
    });

    it('defaults to monthly range when unspecified', () => {
      expect(normalizeReportState({}).range).toBe('monthly');
    });
  });

  describe('readReportStateFromUrl', () => {
    it('extracts all known params', () => {
      const url = new URL(
        'http://localhost/reports?range=yearly&period=2026&currency=IDR&user_id=u1'
      );
      const state = readReportStateFromUrl(url);
      expect(state.range).toBe('yearly');
      expect(state.period).toBe('2026');
      expect(state.currency).toBe('IDR');
      expect(state.userId).toBe('u1');
    });

    it('returns empty object for URLs with no params', () => {
      const url = new URL('http://localhost/reports');
      const state = readReportStateFromUrl(url);
      expect(state.range).toBeUndefined();
      expect(state.period).toBeUndefined();
    });
  });

  describe('REPORT_SECTION_PATHS', () => {
    it('maps sections to correct paths', () => {
      expect(REPORT_SECTION_PATHS.overview).toBe('/reports');
      expect(REPORT_SECTION_PATHS.expenses).toBe('/reports/expenses');
      expect(REPORT_SECTION_PATHS.income).toBe('/reports/income');
    });
  });
});
