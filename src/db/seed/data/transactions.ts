/**
 * Transaction Data Templates
 */

// Income transaction templates (repeated for each seeded month)
// Day values are capped to the month's last day automatically
export const INCOME_TEMPLATES = [
  // Pattern A: current month
  [
    { description: 'Dad Salary', amount: 15000000, day: 25 },
    { description: 'Side Business', amount: 3500000, day: 5 },
    { description: 'Side Business', amount: 2500000, day: 10 },
    { description: 'Dad Salary', amount: 5000000, day: 15 },
    { description: 'Dad Salary', amount: 3000000, day: 20 },
    { description: 'Dividend', amount: 1500000, day: 8 },
    { description: 'Dividend', amount: 800000, day: 12 },
  ],
  // Pattern B: 1 month ago
  [
    { description: 'Dad Salary', amount: 15000000, day: 25 },
    { description: 'Side Business', amount: 2000000, day: 5 },
    { description: 'Side Business', amount: 4000000, day: 10 },
    { description: 'Mom Salary', amount: 3500000, day: 15 },
    { description: 'Mom Salary', amount: 2500000, day: 20 },
    { description: 'Side Business', amount: 3500000, day: 8 },
  ],
  // Pattern C: 2 months ago
  [
    { description: 'Dad Salary', amount: 15000000, day: 25 },
    { description: 'Side Business', amount: 2500000, day: 5 },
    { description: 'Dad Salary', amount: 5000000, day: 12 },
    { description: 'Dad Salary', amount: 3000000, day: 18 },
    { description: 'Dividend', amount: 1500000, day: 8 },
    { description: 'Dividend', amount: 800000, day: 15 },
  ],
];

// Expense transactions with categories and amounts
export const EXPENSE_TRANSACTIONS: Array<{
  description: string;
  category: string;
  amount: number | [number, number];
  months?: number[];
}> = [
  // Regular monthly expenses
  {
    description: 'House Installment Payment 20/36',
    category: 'Installment Debt',
    amount: 8500000,
  },
  { description: 'Health Insurance - Dad', category: 'Insurance', amount: 500000 },
  { description: 'Health Insurance - Mom', category: 'Insurance', amount: 400000 },
  { description: 'Health Insurance', category: 'Insurance', amount: [300000, 500000] },
  { description: 'Internet', category: 'Utility Bills', amount: 450000 },
  { description: 'Subscriptions', category: 'Misc. Cost', amount: 250000 },
  { description: 'School Tuition - Kid 1', category: 'Kids Expenses', amount: [500000, 1500000] },
  { description: 'School Tuition - Kid 2', category: 'Kids Expenses', amount: [400000, 1200000] },
  { description: 'HOA Fee', category: 'Utility Bills', amount: [500000, 800000] },
  { description: 'Water Bill', category: 'Utility Bills', amount: [150000, 300000] },
  { description: 'Electricity', category: 'Utility Bills', amount: [800000, 1500000] },
  { description: 'Housekeeper Salary 1', category: 'Housekeeper Salary', amount: 1900000 },
  { description: 'Housekeeper Salary 2', category: 'Housekeeper Salary', amount: 2900000 },
  { description: 'Housekeeper Salary 3', category: 'Housekeeper Salary', amount: 4000000 },
  {
    description: 'Housekeeper Salary Bonus',
    category: 'Housekeeper Salary',
    amount: [2000000, 2500000],
  },
  { description: 'Health Insurance', category: 'Pocket Money', amount: [200000, 400000] },
  { description: 'Personal Care', category: 'Pocket Money', amount: [100000, 300000] },

  // Variable expenses
  { description: 'Home Decor', category: 'House Expenses', amount: [500000, 2000000] },
  { description: 'Pet Supplies', category: 'Misc. Cost', amount: [50000, 200000] },
  { description: 'Specialty Food', category: 'Food & Groceries', amount: [100000, 300000] },
  { description: 'Family Allowance', category: 'Misc. Cost', amount: [200000, 1000000] },
  { description: 'Fruit Shop', category: 'Food & Groceries', amount: [50000, 200000] },
  { description: 'Supermarket', category: 'Food & Groceries', amount: [200000, 800000] },
  { description: 'Bakery', category: 'Food & Groceries', amount: [150000, 400000] },
  { description: 'Minimarket', category: 'Food & Groceries', amount: [100000, 500000] },
  { description: 'Minimarket', category: 'Food & Groceries', amount: [150000, 600000] },
  { description: 'Snacks', category: 'Food & Groceries', amount: [30000, 150000] },
  { description: 'Fruit Market', category: 'Food & Groceries', amount: [100000, 400000] },
  { description: 'Bakery', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Pharmacy', category: 'Misc. Cost', amount: [100000, 500000] },
  { description: 'Health Store', category: 'Misc. Cost', amount: [150000, 600000] },
  { description: 'Electronics Repair', category: 'Misc. Cost', amount: [500000, 1500000] },
  { description: 'Market Groceries', category: 'Food & Groceries', amount: [200000, 700000] },
  { description: 'Supermarket', category: 'Food & Groceries', amount: [300000, 1000000] },
  { description: 'Market Cash', category: 'Food & Groceries', amount: [150000, 600000] },
  { description: 'Street Food', category: 'Food & Groceries', amount: [50000, 200000] },
  { description: 'Noodle Restaurant', category: 'Food & Groceries', amount: [80000, 200000] },
  { description: 'Bakery Cafe', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Breakfast Street Food', category: 'Food & Groceries', amount: [40000, 120000] },
  { description: 'Pharmacy', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Pet Food', category: 'House Expenses', amount: [100000, 300000] },
  { description: 'Water Delivery', category: 'Food & Groceries', amount: [60000, 80000] },
  { description: 'Juice Bar', category: 'Food & Groceries', amount: [30000, 80000] },
  { description: 'Fruits', category: 'Food & Groceries', amount: [100000, 400000] },

  // Dining out
  { description: 'Ramen Seirockya', category: 'Dine Out', amount: [80000, 150000] },
  { description: 'Makmal', category: 'Dine Out', amount: [100000, 300000] },
  { description: 'Titik Beku Cafe', category: 'Dine Out', amount: [100000, 250000] },
  { description: 'Paulaners', category: 'Dine Out', amount: [150000, 400000] },
  { description: 'Makan di GI', category: 'Dine Out', amount: [200000, 500000] },
  { description: 'Mie Gacoan', category: 'Dine Out', amount: [60000, 150000] },

  // Holiday/Travel
  { description: 'Shopping - City', category: 'Holiday', amount: [300000, 1500000] },
  { description: 'Bakery - City', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Kitchen Store', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Attraction Tickets', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Coffee Shop', category: 'Holiday', amount: [50000, 100000] },
  { description: 'Adventure Activities', category: 'Holiday', amount: [500000, 1500000] },
  { description: 'Local Treats', category: 'Holiday', amount: [50000, 150000] },
  { description: 'Coffee Stop', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Hotel Extra Bed', category: 'Holiday', amount: [500000, 1000000] },
  { description: 'Fashion Outlet', category: 'Holiday', amount: [300000, 1000000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Souvenir Shop', category: 'Holiday', amount: [100000, 500000] },
  { description: 'Cafe', category: 'Holiday', amount: [200000, 600000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 500000] },
  { description: 'Hotel Stay', category: 'Holiday', amount: [2000000, 5000000] },
  { description: 'Rest Area', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Coffee', category: 'Holiday', amount: [50000, 150000] },
  { description: 'Lunch', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Noodle Restaurant', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Night Food', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Mall Shopping', category: 'Holiday', amount: [200000, 600000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 400000] },

  // Family expenses
  { description: 'Family Transfer 1', category: 'Kids Expenses', amount: [1000000, 3000000] },
  { description: 'Family Transfer 2', category: 'Kids Expenses', amount: [500000, 2000000] },
  { description: 'Home Maintenance', category: 'House Expenses', amount: [500000, 2000000] },
  { description: 'Family Transport', category: 'House Expenses', amount: [300000, 800000] },
  { description: 'Family Shopping', category: 'House Expenses', amount: [500000, 2000000] },
  { description: 'Home Accessories', category: 'House Expenses', amount: [200000, 600000] },
  { description: 'Weekend Coffee', category: 'Misc. Cost', amount: [80000, 200000] },
  { description: 'Software Subscription', category: 'Misc. Cost', amount: [100000, 300000] },
  {
    description: 'Software Subscription - Annual',
    category: 'Misc. Cost',
    amount: [100000, 300000],
    months: [1],
  },
  { description: 'Cafe', category: 'Misc. Cost', amount: [80000, 150000] },
  { description: 'Cafe', category: 'Misc. Cost', amount: [150000, 300000] },
  { description: 'Ramen Restaurant', category: 'Misc. Cost', amount: [100000, 250000] },
  { description: 'Haircut', category: 'Pocket Money', amount: [75000, 150000] },
  { description: 'Theme Park', category: 'Kids Expenses', amount: [300000, 800000] },
  { description: 'Arcade', category: 'Kids Expenses', amount: [200000, 500000] },
  { description: 'Cooking Class', category: 'Kids Expenses', amount: [150000, 400000] },
  { description: 'Books', category: 'Kids Expenses', amount: [200000, 500000] },
  { description: 'Language Course', category: 'Kids Expenses', amount: [500000, 1500000] },
  { description: 'Indoor Playground', category: 'Kids Expenses', amount: [300000, 700000] },
  { description: 'Play Center', category: 'Kids Expenses', amount: [250000, 600000] },
  { description: 'Tutoring', category: 'Kids Expenses', amount: [100000, 300000] },
  { description: 'Personal Care', category: 'Kids Expenses', amount: [50000, 150000] },

  // Work support
  { description: 'Hospital Snacks', category: 'Work Support', amount: [50000, 150000] },
  { description: 'Transport to Hospital 1', category: 'Work Support', amount: [30000, 80000] },
  { description: 'Transport to Hospital 2', category: 'Work Support', amount: [30000, 80000] },
  { description: 'Transport to Hospital 3', category: 'Work Support', amount: [30000, 70000] },
  { description: 'Transport Ride-hailing', category: 'Work Support', amount: [40000, 100000] },
  {
    description: 'Office Holiday Contribution',
    category: 'Work Support',
    amount: [200000, 500000],
  },

  // Work reimbursements (these are expenses that get reimbursed)
  { description: 'Business Hotel', category: 'Work Support', amount: [2000000, 5000000] },
  { description: 'Business Travel Insurance', category: 'Work Support', amount: [300000, 800000] },
  { description: 'Visa Application', category: 'Work Support', amount: [800000, 2000000] },
  { description: 'Visa Fee', category: 'Work Support', amount: [1000000, 2500000] },
  { description: 'Transport for Business', category: 'Work Support', amount: [200000, 500000] },
  { description: 'Internet for Work', category: 'Work Support', amount: [300000, 600000] },

  // Utilities and bills
  { description: 'Mobile Plan 1', category: 'Utility Bills', amount: [200000, 400000] },
  { description: 'Mobile Plan 2', category: 'Utility Bills', amount: [150000, 350000] },
  { description: 'Mobile Plan 3', category: 'Utility Bills', amount: [200000, 400000] },
  { description: 'Mobile Plan 4', category: 'Utility Bills', amount: [150000, 350000] },
  { description: 'Electricity - Second Home', category: 'Utility Bills', amount: [300000, 800000] },

  // Shopping and home
  { description: 'Online Shopping', category: 'Misc. Cost', amount: [100000, 400000] },
  { description: 'School Project', category: 'Kids Expenses', amount: [50000, 200000] },
  { description: 'Towels', category: 'House Expenses', amount: [100000, 300000] },
  { description: 'Home Supplies', category: 'House Expenses', amount: [50000, 150000] },
  { description: 'AC Service', category: 'House Expenses', amount: [500000, 1500000] },
  { description: 'Bedding', category: 'House Expenses', amount: [2000000, 5000000] },
  { description: 'Gardening Supplies', category: 'Misc. Cost', amount: [80000, 200000] },
  { description: 'Chemical Supplies', category: 'Misc. Cost', amount: [300000, 800000] },
  { description: 'Storage Fee', category: 'Misc. Cost', amount: [200000, 600000] },
  { description: 'Cleaning Service', category: 'Misc. Cost', amount: [150000, 400000] },

  // Personal care
  { description: 'Hair Care', category: 'Pocket Money', amount: [100000, 300000] },
  { description: 'Clothing', category: 'Pocket Money', amount: [50000, 150000] },

  // Transportation
  { description: 'Gasoline', category: 'Transportation', amount: [300000, 800000] },
  { description: 'Transit Card Top-up', category: 'Transportation', amount: [200000, 600000] },

  // Insurance via marketplace
  { description: 'Health Insurance - Family', category: 'Insurance', amount: [300000, 800000] },

  // Entertainment
  { description: 'Movie Tickets', category: 'Entertainment', amount: [100000, 250000] },
  { description: 'Streaming Subscription', category: 'Entertainment', amount: [50000, 150000] },
  { description: 'Concert Tickets', category: 'Entertainment', amount: [300000, 800000] },
  { description: 'Game Purchase', category: 'Entertainment', amount: [200000, 500000] },
  { description: 'Bowling', category: 'Entertainment', amount: [150000, 350000] },
  { description: 'Karaoke', category: 'Entertainment', amount: [200000, 500000] },
  { description: 'Sports Event', category: 'Entertainment', amount: [150000, 400000] },

  // House Renovation
  { description: 'Paint Supplies', category: 'House Renovation', amount: [500000, 1500000] },
  { description: 'Furniture Assembly', category: 'House Renovation', amount: [300000, 800000] },
  { description: 'Kitchen Upgrade', category: 'House Renovation', amount: [1000000, 3000000] },
  { description: 'Bathroom Fixtures', category: 'House Renovation', amount: [500000, 2000000] },
  { description: 'Flooring Materials', category: 'House Renovation', amount: [1500000, 4000000] },
  { description: 'Contractor Labor', category: 'House Renovation', amount: [800000, 2500000] },
  { description: 'Lighting Upgrade', category: 'House Renovation', amount: [300000, 1000000] },
];
