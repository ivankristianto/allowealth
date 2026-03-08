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
    name: 'Rent',
    type: 'expense',
    amount: '5000000',
    dayOfMonth: 1,
    category: 'House Expenses',
    account: 'Transfer',
    totalOccurrences: 24,
    startDate: '2026-01-01',
  },
  {
    name: 'Netflix',
    type: 'expense',
    amount: '199000',
    dayOfMonth: 15,
    category: 'Entertainment',
    account: 'BCA Credit Card',
    totalOccurrences: 12,
    startDate: '2026-01-01',
  },
  {
    name: 'iPhone 17 Pro',
    type: 'expense',
    amount: '1500000',
    dayOfMonth: 20,
    category: 'Installment Debt',
    account: 'BCA Credit Card',
    totalOccurrences: 12,
    isInstallment: true,
    installmentLabel: 'Installment',
    startingOccurrenceNumber: 5,
    startDate: '2025-10-01',
  },
  {
    name: 'Gym Membership',
    type: 'expense',
    amount: '500000',
    dayOfMonth: 5,
    category: 'Misc. Cost',
    account: 'Cash',
    status: 'paused',
    startDate: '2026-01-01',
    totalOccurrences: 12,
  },
  {
    name: 'Monthly Salary',
    type: 'income',
    amount: '15000000',
    dayOfMonth: 25,
    category: 'Dad Salary',
    account: 'Transfer',
    endDate: '2027-12-31',
    startDate: '2026-01-01',
  },
  {
    name: 'Weekly Groceries',
    type: 'expense',
    amount: '750000',
    dayOfMonth: 6,
    category: 'Groceries',
    account: 'Cash',
    frequency: 'weekly',
    intervalCount: 1,
    startDate: '2026-01-06',
    endDate: '2026-12-31',
  },
  {
    name: 'Bond Coupon - ABC',
    type: 'income',
    amount: '3000000',
    dayOfMonth: 12,
    category: 'Investment Income',
    account: 'Transfer',
    frequency: 'monthly',
    intervalCount: 6,
    startDate: '2026-01-12',
    endDate: '2028-12-31',
  },
  {
    name: 'Quarterly Insurance',
    type: 'expense',
    amount: '2500000',
    dayOfMonth: 1,
    category: 'Insurance',
    account: 'Transfer',
    frequency: 'monthly',
    intervalCount: 3,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
  },
];
