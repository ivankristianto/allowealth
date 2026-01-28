import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Budget/History',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
Budget history page for viewing historical budget data with currency and time range filters.

### Icon Specifications

| Icon | Component | Size | Location |
|------|-----------|------|----------|
| SlidersHorizontal | Currency selector | 16px | Dropdown button |
| CircleX | Error state | 24px | Error alert |

### Page Structure

| Section | Description |
|---------|-------------|
| Header | Title "Budget History" with description |
| Currency Selector | IDR/USD dropdown with SlidersHorizontal icon |
| Months Selector | 6, 12, 18, 24 months options |
| Tabs | Overview and History views |
| Content | BudgetHistoryComparison component |
| Error State | Alert with CircleX icon |

### Query Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| months | 6, 12, 18, 24 | 12 |
| currency | IDR, USD | IDR |

### Responsive Behavior
- **Mobile**: Controls stack vertically (\`flex-col\`)
- **Desktop (sm+)**: Controls align horizontally (\`sm:flex-row\`, \`sm:items-center\`)

### Accessibility
- Icons: \`aria-hidden="true"\` (decorative)
- Error alert: \`role="alert"\`
- Heading hierarchy: h2 for page title

### Data Flow
1. Fetch budget history from \`budgetService.getBudgetHistory()\`
2. Handle errors with try/catch
3. Pass data to \`BudgetHistoryComparison\` component
4. Include currentMonth and currentYear props

### Integration Points
- Uses \`ProtectedLayout\` wrapper
- Passes \`currentPath="/budget/history"\`
- Integrates with \`BudgetHistoryComparison\` organism
        `,
      },
    },
  },
  argTypes: {
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
    },
    months: {
      control: 'select',
      options: [6, 12, 18, 24],
    },
    hasError: { control: 'boolean' },
  },
};

export default meta;

const createBudgetHistoryPage = (args: {
  currency?: string;
  months?: number;
  hasError?: boolean;
}): HTMLElement => {
  const { currency = 'IDR', months = 12, hasError = false } = args;

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto p-6 space-y-6';

  // Header
  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
  header.innerHTML = `
    <div>
      <h2 class="text-2xl font-bold text-base-content">Budget History</h2>
      <p class="text-sm text-neutral mt-1">View your spending patterns over time</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <div class="dropdown dropdown-end">
        <button tabindex="0" class="btn btn-outline btn-sm gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true">
            <line x1="21" x2="14" y1="4" y2="4"/>
            <line x1="10" x2="3" y1="4" y2="4"/>
            <line x1="21" x2="12" y1="12" y2="12"/>
            <line x1="8" x2="3" y1="12" y2="12"/>
            <line x1="21" x2="16" y1="20" y2="20"/>
            <line x1="12" x2="3" y1="20" y2="20"/>
            <line x1="14" x2="14" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="10" y2="14"/>
            <line x1="16" x2="16" y1="18" y2="22"/>
          </svg>
          ${currency}
        </button>
      </div>
      <select class="select select-bordered select-sm">
        ${[6, 12, 18, 24].map((m) => `<option ${m === months ? 'selected' : ''}>${m} months</option>`).join('')}
      </select>
    </div>
  `;
  container.appendChild(header);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'tabs tabs-bordered';
  tabs.innerHTML = `
    <a class="tab">Overview</a>
    <a class="tab tab-active">History</a>
  `;
  container.appendChild(tabs);

  // Content
  if (hasError) {
    const errorAlert = document.createElement('div');
    errorAlert.className = 'alert alert-error';
    errorAlert.setAttribute('role', 'alert');
    errorAlert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="m15 9-6 6"/>
        <path d="m9 9 6 6"/>
      </svg>
      <span>Failed to load budget history. Please try again.</span>
    `;
    container.appendChild(errorAlert);
  } else {
    const content = document.createElement('div');
    content.className = 'card bg-base-100 border border-base-300 p-6';
    content.innerHTML = `
      <p class="text-base-content/60">Budget history comparison chart would render here</p>
      <p class="text-sm text-neutral mt-2">Showing ${months} months of data in ${currency}</p>
    `;
    container.appendChild(content);
  }

  return container;
};

export const Default: StoryObj = {
  args: { currency: 'IDR', months: 12, hasError: false },
  render: (args) => createBudgetHistoryPage(args),
};

export const USDCurrency: StoryObj = {
  args: { currency: 'USD', months: 12, hasError: false },
  render: (args) => createBudgetHistoryPage(args),
};

export const SixMonths: StoryObj = {
  args: { currency: 'IDR', months: 6, hasError: false },
  render: (args) => createBudgetHistoryPage(args),
};

export const ErrorState: StoryObj = {
  args: { currency: 'IDR', months: 12, hasError: true },
  render: (args) => createBudgetHistoryPage(args),
};
