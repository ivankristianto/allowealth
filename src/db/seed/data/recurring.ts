/**
 * Recurring Template Data Templates
 */

export interface RecurringTemplateSeed {
  name: string;
  type: 'expense' | 'income';
  amount: string;
  dayOfMonth: number;
  category: string;
  account: string;
  frequency?: 'weekly' | 'monthly';
  intervalCount?: number;
  startDate: string;
  endDate?: string;
  totalOccurrences?: number;
  isInstallment?: boolean;
  installmentLabel?: string;
  startingOccurrenceNumber?: number;
  description?: string;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
}

export const RECURRING_TEMPLATE_DATA: RecurringTemplateSeed[] = [
  {
    name: 'Home Mortgage',
    type: 'expense',
    amount: '8800000',
    dayOfMonth: 3,
    category: 'Installment Debt',
    account: 'Current Account',
    totalOccurrences: 180,
    startDate: '2026-01-01',
  },
  {
    name: 'Netflix Family',
    type: 'expense',
    amount: '199000',
    dayOfMonth: 15,
    category: 'Entertainment',
    account: 'BCA Credit Card',
    totalOccurrences: 12,
    startDate: '2026-01-01',
  },
  {
    name: 'Family Gadget Installment',
    type: 'expense',
    amount: '1450000',
    dayOfMonth: 18,
    category: 'Installment Debt',
    account: 'BCA Credit Card',
    totalOccurrences: 12,
    isInstallment: true,
    installmentLabel: 'Installment',
    startingOccurrenceNumber: 5,
    startDate: '2025-10-01',
  },
  {
    name: 'Kids Swimming Class',
    type: 'expense',
    amount: '650000',
    dayOfMonth: 9,
    category: 'Kids Expenses',
    account: 'Current Account',
    status: 'paused',
    startDate: '2026-01-01',
    totalOccurrences: 12,
  },
  {
    name: 'Dad Salary',
    type: 'income',
    amount: '24000000',
    dayOfMonth: 25,
    category: 'Dad Salary',
    account: 'Current Account',
    endDate: '2027-12-31',
    startDate: '2026-01-01',
  },
  {
    name: 'Fixed Deposit Interest',
    type: 'income',
    amount: '950000',
    dayOfMonth: 11,
    category: 'Fixed Deposits',
    account: 'Current Account',
    startDate: '2026-01-11',
    endDate: '2027-12-31',
  },
  {
    name: 'Bond Coupon',
    type: 'income',
    amount: '1200000',
    dayOfMonth: 7,
    category: 'Bonds',
    account: 'Current Account',
    frequency: 'monthly',
    intervalCount: 1,
    startDate: '2026-01-07',
    endDate: '2028-12-31',
  },
  {
    name: 'Quarterly Insurance',
    type: 'expense',
    amount: '1600000',
    dayOfMonth: 16,
    category: 'Insurance',
    account: 'Current Account',
    frequency: 'monthly',
    intervalCount: 3,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
  },
];
