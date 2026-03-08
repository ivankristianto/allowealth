import { describe, expect, it } from 'bun:test';
import { DEMO_ADMIN, DEMO_MEMBER } from '../config';
import { getAccountTypes, getLoanAccounts, getPaymentAccounts } from './accounts';
import { INCOME_CATEGORIES } from './categories';
import { calculatePlannedMonthlyCashflow, getIncomeTemplateForMonth } from './transactions';

describe('default household seed scenario', () => {
  it('keeps access limited to dad and mom in the default seed', () => {
    expect(DEMO_ADMIN.name).toBe('Dad');
    expect(DEMO_MEMBER.name).toBe('Mom');
  });

  it('includes the requested household accounts and income sources', () => {
    expect(getPaymentAccounts().some((account) => account.name === 'BCA - 2332')).toBe(true);
    const loanNames = getLoanAccounts().map((account) => account.name);
    const investmentNames = getAccountTypes().map((account) => account.name);
    const incomeCategoryNames = INCOME_CATEGORIES.map((category) => category.name);

    for (const name of ['Home Mortgage - BSD', 'Car Loan - Innova'] as const) {
      expect(loanNames.includes(name)).toBe(true);
    }
    for (const name of [
      'Jenius - 8812',
      'BCA Deposit - 9912',
      'Mandiri Deposit - 1122',
      'SBR012 Bond',
      'ORI023 Bond',
      'SR018 Sukuk',
      'Dividend Portfolio',
      'Sucorinvest Money Market Fund',
      'Schroder Dana Prestasi',
      'Batavia Dana Kas Maxima',
      'DBS - 5521',
      'Antam Gold 10g',
    ] as const) {
      expect(investmentNames.includes(name)).toBe(true);
    }
    for (const name of [
      'Dad Salary',
      'Mom Salary',
      'Bonds',
      'Fixed Deposits',
      'Dividends',
      'Other Side Income',
    ] as const) {
      expect(incomeCategoryNames.includes(name)).toBe(true);
    }
  });

  it('cycles through months with both surplus and deficit household cashflow', () => {
    const nets = Array.from({ length: 6 }, (_, monthIndex) => {
      const monthlyCashflow = calculatePlannedMonthlyCashflow(monthIndex);
      return monthlyCashflow.netSavings;
    });

    expect(nets.some((value) => value > 0)).toBe(true);
    expect(nets.some((value) => value < 0)).toBe(true);
  });

  it('pays both parents and passive income sources into the BCA - 2332 plan', () => {
    const monthPlan = getIncomeTemplateForMonth(0);
    const categories = monthPlan.map((entry) => entry.category);
    const momSalary = monthPlan.find((entry) => entry.category === 'Mom Salary');

    for (const name of [
      'Dad Salary',
      'Mom Salary',
      'Bonds',
      'Fixed Deposits',
      'Dividends',
      'Other Side Income',
    ] as const) {
      expect(categories.includes(name)).toBe(true);
    }
    expect(momSalary?.owner).toBe('mom');
    expect(new Set(monthPlan.map((entry) => entry.account))).toEqual(new Set(['BCA - 2332']));
  });
});
