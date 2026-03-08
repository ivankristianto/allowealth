/**
 * Transaction Data Templates
 */

import { CURRENT_ACCOUNT_NAME } from './accounts';

export interface IncomeTransactionTemplate {
  owner: 'dad' | 'mom';
  category:
    | 'Dad Salary'
    | 'Mom Salary'
    | 'Bonds'
    | 'Fixed Deposits'
    | 'Dividends'
    | 'Other Side Income';
  description: string;
  amount: number;
  day: number;
  account: string;
}

export interface ExpenseTransactionTemplate {
  description: string;
  category: string;
  amount: number;
  day: number;
  account: string;
}

export interface HouseholdExpenseProfile {
  label: string;
  fixedExpenseMultiplier: number;
  variableExpenseMultiplier: number;
  plannedDailyExpenseTotal: number;
  dailyExpenseAmountRange: [number, number];
  extraExpenses: ExpenseTransactionTemplate[];
}

const INCOME_PATTERNS: IncomeTransactionTemplate[][] = [
  [
    {
      owner: 'dad',
      category: 'Dad Salary',
      description: 'Dad Salary - PT Nusantara Teknologi',
      amount: 24_000_000,
      day: 25,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Mom Salary',
      description: 'Mom Salary - Bright Steps School',
      amount: 14_000_000,
      day: 27,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Bonds',
      description: 'Government Bond Coupon',
      amount: 1_200_000,
      day: 7,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Fixed Deposits',
      description: 'Fixed Deposit Interest',
      amount: 950_000,
      day: 11,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Dividends',
      description: 'Dividend Distribution',
      amount: 1_600_000,
      day: 18,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Other Side Income',
      description: 'Weekend Baking Orders',
      amount: 2_400_000,
      day: 8,
      account: CURRENT_ACCOUNT_NAME,
    },
  ],
  [
    {
      owner: 'dad',
      category: 'Dad Salary',
      description: 'Dad Salary - PT Nusantara Teknologi',
      amount: 24_000_000,
      day: 25,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Mom Salary',
      description: 'Mom Salary - Bright Steps School',
      amount: 14_000_000,
      day: 27,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Bonds',
      description: 'Government Bond Coupon',
      amount: 1_200_000,
      day: 7,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Fixed Deposits',
      description: 'Fixed Deposit Interest',
      amount: 900_000,
      day: 11,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Dividends',
      description: 'Dividend Distribution',
      amount: 600_000,
      day: 18,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Other Side Income',
      description: 'Freelance Product Coaching',
      amount: 1_100_000,
      day: 13,
      account: CURRENT_ACCOUNT_NAME,
    },
  ],
  [
    {
      owner: 'dad',
      category: 'Dad Salary',
      description: 'Dad Salary - PT Nusantara Teknologi',
      amount: 24_000_000,
      day: 25,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Mom Salary',
      description: 'Mom Salary - Bright Steps School',
      amount: 14_000_000,
      day: 27,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Bonds',
      description: 'Corporate Bond Coupon',
      amount: 1_350_000,
      day: 7,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Fixed Deposits',
      description: 'Fixed Deposit Interest',
      amount: 975_000,
      day: 11,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Dividends',
      description: 'Dividend Distribution',
      amount: 1_450_000,
      day: 18,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Other Side Income',
      description: 'Freelance Workshop Fee',
      amount: 2_900_000,
      day: 9,
      account: CURRENT_ACCOUNT_NAME,
    },
  ],
  [
    {
      owner: 'dad',
      category: 'Dad Salary',
      description: 'Dad Salary - PT Nusantara Teknologi',
      amount: 24_000_000,
      day: 25,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Mom Salary',
      description: 'Mom Salary - Bright Steps School',
      amount: 14_000_000,
      day: 27,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Bonds',
      description: 'Government Bond Coupon',
      amount: 1_200_000,
      day: 7,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Fixed Deposits',
      description: 'Fixed Deposit Interest',
      amount: 920_000,
      day: 11,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'dad',
      category: 'Dividends',
      description: 'Dividend Distribution',
      amount: 500_000,
      day: 18,
      account: CURRENT_ACCOUNT_NAME,
    },
    {
      owner: 'mom',
      category: 'Other Side Income',
      description: 'Weekend Catering Project',
      amount: 700_000,
      day: 21,
      account: CURRENT_ACCOUNT_NAME,
    },
  ],
];

const FIXED_EXPENSES: ExpenseTransactionTemplate[] = [
  {
    description: 'Home Mortgage Installment',
    category: 'Installment Debt',
    amount: 8_800_000,
    day: 3,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Car Loan Installment',
    category: 'Installment Debt',
    amount: 3_600_000,
    day: 6,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Family Gadget Installment',
    category: 'Installment Debt',
    amount: 1_450_000,
    day: 18,
    account: 'BCA Credit Card',
  },
  {
    description: 'School Tuition - Kid 1',
    category: 'Kids Expenses',
    amount: 2_700_000,
    day: 4,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'School Tuition - Kid 2',
    category: 'Kids Expenses',
    amount: 2_100_000,
    day: 5,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Electricity',
    category: 'Utility Bills',
    amount: 1_200_000,
    day: 11,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Water Bill',
    category: 'Utility Bills',
    amount: 250_000,
    day: 13,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Internet',
    category: 'Utility Bills',
    amount: 500_000,
    day: 15,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Family Insurance',
    category: 'Insurance',
    amount: 1_600_000,
    day: 16,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Housekeeper Salary',
    category: 'Housekeeper Salary',
    amount: 2_800_000,
    day: 28,
    account: CURRENT_ACCOUNT_NAME,
  },
];

const VARIABLE_EXPENSES: ExpenseTransactionTemplate[] = [
  {
    description: 'Groceries - Monthly Stock Up',
    category: 'Food & Groceries',
    amount: 5_400_000,
    day: 2,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Fresh Produce and Protein',
    category: 'Food & Groceries',
    amount: 1_200_000,
    day: 10,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Fuel and Toll',
    category: 'Transportation',
    amount: 1_300_000,
    day: 9,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Ride-hailing and Parking',
    category: 'Transportation',
    amount: 450_000,
    day: 19,
    account: 'GoPay',
  },
  {
    description: 'Weekend Dining',
    category: 'Dine Out',
    amount: 900_000,
    day: 21,
    account: 'BCA Credit Card',
  },
  {
    description: 'Kids Activities',
    category: 'Kids Expenses',
    amount: 850_000,
    day: 22,
    account: 'Mandiri Credit Card',
  },
  {
    description: 'Pharmacy and Wellness',
    category: 'Misc. Cost',
    amount: 550_000,
    day: 20,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'House Supplies',
    category: 'House Expenses',
    amount: 700_000,
    day: 23,
    account: CURRENT_ACCOUNT_NAME,
  },
  {
    description: 'Streaming and Apps',
    category: 'Entertainment',
    amount: 250_000,
    day: 17,
    account: 'BCA Credit Card',
  },
];

const HOUSEHOLD_MONTH_PROFILES: HouseholdExpenseProfile[] = [
  {
    label: 'steady-surplus',
    fixedExpenseMultiplier: 1,
    variableExpenseMultiplier: 0.95,
    plannedDailyExpenseTotal: 2_100_000,
    dailyExpenseAmountRange: [60_000, 220_000],
    extraExpenses: [],
  },
  {
    label: 'school-and-repair',
    fixedExpenseMultiplier: 1.02,
    variableExpenseMultiplier: 1.15,
    plannedDailyExpenseTotal: 3_400_000,
    dailyExpenseAmountRange: [80_000, 300_000],
    extraExpenses: [
      {
        description: 'New School Term Books and Uniforms',
        category: 'Kids Expenses',
        amount: 4_200_000,
        day: 8,
        account: CURRENT_ACCOUNT_NAME,
      },
      {
        description: 'AC Service and Minor Repairs',
        category: 'House Expenses',
        amount: 1_800_000,
        day: 24,
        account: CURRENT_ACCOUNT_NAME,
      },
    ],
  },
  {
    label: 'bonus-and-savings',
    fixedExpenseMultiplier: 1,
    variableExpenseMultiplier: 0.9,
    plannedDailyExpenseTotal: 2_500_000,
    dailyExpenseAmountRange: [65_000, 210_000],
    extraExpenses: [],
  },
  {
    label: 'medical-and-car-service',
    fixedExpenseMultiplier: 1,
    variableExpenseMultiplier: 1.05,
    plannedDailyExpenseTotal: 3_000_000,
    dailyExpenseAmountRange: [75_000, 260_000],
    extraExpenses: [
      {
        description: 'Car Service and Tire Rotation',
        category: 'Transportation',
        amount: 3_400_000,
        day: 12,
        account: CURRENT_ACCOUNT_NAME,
      },
      {
        description: 'Family Health Checkup',
        category: 'Insurance',
        amount: 1_900_000,
        day: 26,
        account: CURRENT_ACCOUNT_NAME,
      },
    ],
  },
];

export const DAILY_LIVING_EXPENSES = [
  {
    category: 'Food & Groceries',
    descriptions: ['Minimarket', 'Fruit Shop', 'Bakery', 'Fresh Milk'],
    accountOptions: [CURRENT_ACCOUNT_NAME, 'Cash'],
  },
  {
    category: 'Dine Out',
    descriptions: ['Family Lunch', 'Coffee Shop', 'Noodle Dinner', 'Weekend Brunch'],
    accountOptions: ['BCA Credit Card', 'OVO', 'GoPay'],
  },
  {
    category: 'Transportation',
    descriptions: ['Parking', 'Fuel Top-up', 'Ride-hailing', 'Toll Road'],
    accountOptions: [CURRENT_ACCOUNT_NAME, 'GoPay', 'OVO'],
  },
  {
    category: 'Kids Expenses',
    descriptions: ['School Project', 'Books', 'After-school Snack', 'Playdate Supplies'],
    accountOptions: [CURRENT_ACCOUNT_NAME, 'Mandiri Credit Card'],
  },
  {
    category: 'Entertainment',
    descriptions: ['Movie Night', 'Streaming Rental', 'Arcade', 'Family Karaoke'],
    accountOptions: ['BCA Credit Card', 'OVO'],
  },
  {
    category: 'House Expenses',
    descriptions: ['Cleaning Supplies', 'Laundry Items', 'Kitchen Refill', 'Home Essentials'],
    accountOptions: [CURRENT_ACCOUNT_NAME, 'Cash'],
  },
  {
    category: 'Pocket Money',
    descriptions: ['Coffee', 'Snacks', 'Quick Treat', 'Stationery'],
    accountOptions: ['Cash', 'GoPay', 'OVO'],
  },
];

function cycleTemplate<T>(items: T[], monthIndex: number): T {
  return items[monthIndex % items.length]!;
}

function scaleExpenseAmount(amount: number, multiplier: number): number {
  return Math.round(amount * multiplier);
}

export function getIncomeTemplateForMonth(monthIndex: number): IncomeTransactionTemplate[] {
  return cycleTemplate(INCOME_PATTERNS, monthIndex).map((entry) => ({ ...entry }));
}

export function getExpensePlanForMonth(monthIndex: number) {
  const profile = cycleTemplate(HOUSEHOLD_MONTH_PROFILES, monthIndex);
  const fixedExpenses = FIXED_EXPENSES.map((expense) => ({
    ...expense,
    amount: scaleExpenseAmount(expense.amount, profile.fixedExpenseMultiplier),
  }));
  const variableExpenses = VARIABLE_EXPENSES.map((expense) => ({
    ...expense,
    amount: scaleExpenseAmount(expense.amount, profile.variableExpenseMultiplier),
  }));
  const extraExpenses = profile.extraExpenses.map((expense) => ({ ...expense }));
  const totalPlannedExpenses =
    fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
    variableExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
    extraExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
    profile.plannedDailyExpenseTotal;

  return {
    profile: { ...profile },
    fixedExpenses,
    variableExpenses,
    extraExpenses,
    totalPlannedExpenses,
  };
}

export function calculatePlannedMonthlyCashflow(monthIndex: number) {
  const incomeTotal = getIncomeTemplateForMonth(monthIndex).reduce(
    (sum, entry) => sum + entry.amount,
    0
  );
  const expensePlan = getExpensePlanForMonth(monthIndex);

  return {
    incomeTotal,
    expenseTotal: expensePlan.totalPlannedExpenses,
    netSavings: incomeTotal - expensePlan.totalPlannedExpenses,
    profileLabel: expensePlan.profile.label,
  };
}

// Backwards-compatible export used by benchmark seeding.
export const INCOME_TEMPLATES = INCOME_PATTERNS;
