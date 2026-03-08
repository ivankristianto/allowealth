import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'bun:test';

describe('OpenAPI contract – reports endpoints', () => {
  it('documents the overview, expense, and income report endpoints', () => {
    const reportsPath = readFileSync(join(process.cwd(), 'openapi/paths/reports.yml'), 'utf8');

    expect(reportsPath).toContain('/api/reports:');
    expect(reportsPath).toContain('/api/reports/expenses:');
    expect(reportsPath).toContain('/api/reports/income:');
  });

  it('has dedicated overview schemas', () => {
    const overviewData = readFileSync(
      join(process.cwd(), 'openapi/schemas/OverviewReportData.yml'),
      'utf8'
    );
    const overviewResp = readFileSync(
      join(process.cwd(), 'openapi/schemas/OverviewReportResponse.yml'),
      'utf8'
    );

    expect(overviewData).toContain('OverviewReportData');
    expect(overviewData).toContain('totalIncome');
    expect(overviewData).toContain('totalExpenses');
    expect(overviewData).toContain('netSavings');
    expect(overviewData).toContain('trendData');
    expect(overviewData).toContain('expensePreview');
    expect(overviewData).toContain('incomePreview');
    expect(overviewResp).toContain('OverviewReportResponse');
  });

  it('has dedicated income schemas', () => {
    const incomeData = readFileSync(
      join(process.cwd(), 'openapi/schemas/IncomeReportData.yml'),
      'utf8'
    );
    const incomeResp = readFileSync(
      join(process.cwd(), 'openapi/schemas/IncomeReportResponse.yml'),
      'utf8'
    );

    expect(incomeData).toContain('IncomeReportData');
    expect(incomeData).toContain('totalIncome');
    expect(incomeData).toContain('incomeBySource');
    expect(incomeData).toContain('sourceGroups');
    expect(incomeResp).toContain('IncomeReportResponse');
  });

  it('keeps existing expense schemas for backward compatibility', () => {
    const expenseData = readFileSync(join(process.cwd(), 'openapi/schemas/ReportData.yml'), 'utf8');
    const expenseResp = readFileSync(
      join(process.cwd(), 'openapi/schemas/ReportResponse.yml'),
      'utf8'
    );

    expect(expenseData).toContain('ReportData');
    expect(expenseData).toContain('totalExpenses');
    expect(expenseData).toContain('categoryIntelligence');
    expect(expenseResp).toContain('ReportResponse');
  });
});
