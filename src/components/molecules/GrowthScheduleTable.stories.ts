import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/GrowthScheduleTable',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Container | Card with border | \`bg-base-100 rounded-card border border-base-300 overflow-hidden\` |
| Header Padding | 24px | \`p-6 border-b border-base-300\` |
| Cell Padding | 24px x 16px | \`px-6 py-4\` |
| Header Font | 10px bold uppercase | \`text-xs font-bold uppercase tracking-widest\` |
| Table Style | DaisyUI zebra | \`table table-zebra w-full text-left\` |

### Table Columns

| Column | Alignment | Header Color | Content Style |
|--------|-----------|--------------|---------------|
| Year | Left | text-base-content/50 | "Year N" bold |
| Opening Balance | Right | text-base-content/50 | Currency (medium) |
| Interest Earned | Right | text-success | "+" prefix, Currency (bold, green) |
| Closing Balance | Right | text-base-content | Currency (bold) |

### Header Section
- Title: "Growth Schedule" (\`font-bold text-base-content tracking-tight\`)
- Subtitle: "Yearly breakdown..." (\`text-xs uppercase tracking-widest text-base-content/50\`)

### Interactive States
- Row hover: \`hover:bg-base-200/50 transition-colors\`
- Zebra striping via DaisyUI \`table-zebra\`
- Row dividers: \`divide-y divide-base-300\`

### Accessibility
- Semantic \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, \`<td>\`
- Right-aligned numeric columns (standard practice)
- Currency symbols included in formatted amounts
- Meets WCAG AA contrast requirements

### Responsive Design
- \`overflow-x-auto\` enables horizontal scroll on mobile
- All 4 columns always present (no hiding)
- Table structure maintained on all screen sizes

### Props
- **data**: YearlyData[] (year, openingBalance, interest, closingBalance)
- **currency**: IDR | USD (default: IDR)
- **className**: Additional CSS classes
- **id**: Optional element ID
        `,
      },
    },
  },
  argTypes: {
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code for formatting',
    },
  },
};

export default meta;

import { formatCurrency } from '@/lib/formatting/currency-client';

/**
 * Mock data for different scenarios
 */
function createMockData(years: number) {
  const data: Array<{
    year: number;
    openingBalance: number;
    interest: number;
    closingBalance: number;
  }> = [];
  let currentBalance = 100000000;

  for (let year = 1; year <= years; year++) {
    const openingBalance = currentBalance;
    const rate = 0.05; // 5% annual rate
    const interest = currentBalance * rate;
    currentBalance += interest;

    data.push({
      year,
      openingBalance,
      interest,
      closingBalance: currentBalance,
    });
  }

  return data;
}

/**
 * Helper function to create GrowthScheduleTable
 */
function createGrowthScheduleTable(args: {
  data?: Array<{ year: number; openingBalance: number; interest: number; closingBalance: number }>;
  currency?: 'IDR' | 'USD';
}): HTMLElement {
  const { data = createMockData(3), currency = 'IDR' } = args;

  const container = document.createElement('div');
  container.className = 'bg-base-100 rounded-card border border-base-300 overflow-hidden';

  // Header section
  const header = document.createElement('div');
  header.className = 'p-6 border-b border-base-300';

  const title = document.createElement('h4');
  title.className = 'font-bold text-base-content tracking-tight';
  title.textContent = 'Growth Schedule';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'text-xs font-bold uppercase tracking-widest text-base-content/50 mt-1';
  subtitle.textContent = 'Yearly breakdown of interest compounding';
  header.appendChild(subtitle);

  container.appendChild(header);

  // Table section
  const tableContainer = document.createElement('div');
  tableContainer.className = 'overflow-x-auto';

  const table = document.createElement('table');
  table.className = 'table table-zebra w-full text-left';

  // Header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.className = 'bg-base-200';

  const headers = [
    { text: 'Year', class: 'text-base-content/50' },
    { text: 'Opening Balance', class: 'text-base-content/50 text-right' },
    { text: 'Interest Earned', class: 'text-success text-right' },
    { text: 'Closing Balance', class: 'text-base-content text-right' },
  ];

  headers.forEach(({ text, class: headerClass }) => {
    const th = document.createElement('th');
    th.className = `px-6 py-4 text-xs font-bold uppercase tracking-widest ${headerClass}`;
    th.textContent = text;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body rows
  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-base-300';

  data.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-base-200/50 transition-colors';

    // Year column
    const yearCell = document.createElement('td');
    yearCell.className = 'px-6 py-4';
    const yearSpan = document.createElement('span');
    yearSpan.className = 'text-sm font-bold text-base-content';
    yearSpan.textContent = `Year ${row.year}`;
    yearCell.appendChild(yearSpan);
    tr.appendChild(yearCell);

    // Opening Balance column
    const openingCell = document.createElement('td');
    openingCell.className = 'px-6 py-4 text-right';
    const openingSpan = document.createElement('span');
    openingSpan.className = 'text-sm font-medium text-base-content/60';
    openingSpan.textContent = formatCurrency(row.openingBalance, currency);
    openingCell.appendChild(openingSpan);
    tr.appendChild(openingCell);

    // Interest Earned column
    const interestCell = document.createElement('td');
    interestCell.className = 'px-6 py-4 text-right';

    const plusSpan = document.createElement('span');
    plusSpan.className = 'text-sm font-bold text-success';
    plusSpan.textContent = '+';
    interestCell.appendChild(plusSpan);

    const interestSpan = document.createElement('span');
    interestSpan.className = 'text-sm font-bold text-success ml-1';
    interestSpan.textContent = formatCurrency(row.interest, currency);
    interestCell.appendChild(interestSpan);

    tr.appendChild(interestCell);

    // Closing Balance column
    const closingCell = document.createElement('td');
    closingCell.className = 'px-6 py-4 text-right';
    const closingSpan = document.createElement('span');
    closingSpan.className = 'text-sm font-bold text-base-content';
    closingSpan.textContent = formatCurrency(row.closingBalance, currency);
    closingCell.appendChild(closingSpan);
    tr.appendChild(closingCell);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
  container.appendChild(tableContainer);

  return container;
}

// Default
export const Default: StoryObj = {
  args: {
    currency: 'IDR',
  },
  render: (args) => createGrowthScheduleTable(args),
};

// USD Currency
export const USD: StoryObj = {
  args: {
    currency: 'USD',
  },
  render: (args) => createGrowthScheduleTable(args),
};

// Long Term (10 years)
export const LongTerm: StoryObj = {
  args: {
    currency: 'IDR',
  },
  render: (args) => createGrowthScheduleTable({ ...args, data: createMockData(10) }),
};

// Empty State
export const Empty: StoryObj = {
  render: () => {
    return createGrowthScheduleTable({ data: [], currency: 'IDR' });
  },
};

// Compact View
export const Compact: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.style.width = '400px';

    const table = createGrowthScheduleTable({ currency: 'IDR' });
    container.appendChild(table);

    return container;
  },
};
