import { formatCurrency } from '@/lib/tokens';

export type CashFlowType = 'income' | 'expense';

export type CashFlowIconName = 'trending-up' | 'calendar' | 'banknote' | 'receipt';

export interface CashFlowEntry {
  name: string;
  date: string;
  amount: number;
  type: CashFlowType;
  icon: CashFlowIconName;
  currency?: 'IDR' | 'USD';
}

export interface CashFlowTypeConfig {
  containerClass: string;
  amountClass: string;
  badgeVariant: 'success' | 'error';
}

export const getCashFlowTypeConfig = (type: CashFlowType): CashFlowTypeConfig => {
  if (type === 'income') {
    return {
      containerClass: 'bg-success/5 border-success/20 hover:border-success/30',
      amountClass: 'text-success',
      badgeVariant: 'success',
    };
  }

  return {
    containerClass: 'bg-error/5 border-error/20 hover:border-error/30',
    amountClass: 'text-error',
    badgeVariant: 'error',
  };
};

export const getCashFlowSignedAmount = (amount: number, type: CashFlowType): number => {
  const normalized = Math.abs(amount);
  if (normalized === 0) {
    return 0;
  }
  return type === 'expense' ? -normalized : normalized;
};

export const formatCashFlowAmount = (
  amount: number,
  type: CashFlowType,
  currency: 'IDR' | 'USD' = 'IDR'
): string => {
  const normalized = Math.abs(amount);
  const baseAmount = formatCurrency(normalized, currency);

  if (normalized === 0) {
    return baseAmount;
  }

  const sign = type === 'expense' ? '-' : '+';
  return `${sign}${baseAmount}`;
};
