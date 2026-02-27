import type { Currency } from '@/lib/constants/currency';
import type { RecurringOccurrenceOutput } from '@/lib/types/recurring';

interface CurrencyAmount {
  currency: Currency;
  amount: string;
}

interface CurrencyCashflow {
  currency: Currency;
  income: string;
  expenses: string;
  net: string;
}

export interface RecurringMonthlySummary {
  upcomingIncomeCount: number;
  upcomingExpenseCount: number;
  incomeByCurrency: CurrencyAmount[];
  expenseByCurrency: CurrencyAmount[];
  netByCurrency: CurrencyCashflow[];
}

function parseAmount(amount: string): number {
  const parsed = Number.parseFloat(amount || '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapAmounts(amountsByCurrency: Map<string, number>): CurrencyAmount[] {
  return Array.from(amountsByCurrency.entries())
    .map(([currency, amount]) => ({
      currency: currency as Currency,
      amount: amount.toString(),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function buildRecurringMonthlySummary(
  occurrences: RecurringOccurrenceOutput[]
): RecurringMonthlySummary {
  const incomeByCurrency = new Map<string, number>();
  const expenseByCurrency = new Map<string, number>();

  let upcomingIncomeCount = 0;
  let upcomingExpenseCount = 0;

  for (const occurrence of occurrences) {
    const amount = parseAmount(occurrence.templateAmount);
    const currency = occurrence.currency;

    if (occurrence.templateType === 'income') {
      upcomingIncomeCount += 1;
      incomeByCurrency.set(currency, (incomeByCurrency.get(currency) ?? 0) + amount);
      continue;
    }

    if (occurrence.templateType === 'expense') {
      upcomingExpenseCount += 1;
      expenseByCurrency.set(currency, (expenseByCurrency.get(currency) ?? 0) + amount);
    }
  }

  const currencySet = new Set([...incomeByCurrency.keys(), ...expenseByCurrency.keys()]);
  const netByCurrency = Array.from(currencySet)
    .map((currency) => {
      const income = incomeByCurrency.get(currency) ?? 0;
      const expenses = expenseByCurrency.get(currency) ?? 0;
      return {
        currency: currency as Currency,
        income: income.toString(),
        expenses: expenses.toString(),
        net: (income - expenses).toString(),
      };
    })
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    upcomingIncomeCount,
    upcomingExpenseCount,
    incomeByCurrency: mapAmounts(incomeByCurrency),
    expenseByCurrency: mapAmounts(expenseByCurrency),
    netByCurrency,
  };
}
