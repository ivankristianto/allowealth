import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Transactions/Export',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
CSV Export page for downloading transactions with filter options.

### Icon Specifications

| Icon | Component | Size | Class | Location |
|------|-----------|------|-------|----------|
| Info | @lucide/astro | 16px | \`shrink-0\` | Export options alert |
| Download | @lucide/astro | 16px | \`stroke-current\` | Export button |

### Page Structure

| Section | Description |
|---------|-------------|
| Header | Title "Export Transactions to CSV" with description |
| Alert | Export options info with Info icon |
| Filters | TransactionFilters component |
| Export Details | Filename format, included fields |
| Export Button | Download CSV with Download icon |

### Export Options Alert
- Style: \`alert-info\`
- Icon: Info (16px) with \`shrink-0\`
- Heading: "Export Options" (h3, font-bold)
- Content: Filter functionality explanation

### TransactionFilters Integration

| Prop | Value |
|------|-------|
| action | "/transactions/export" |
| categories | Active categories from service |
| accounts | Active accounts from service |
| values | Current filters from URL |
| count | 0 |

### Filter Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Text search |
| type | 'expense' \\| 'income' | Transaction type |
| currency | 'IDR' \\| 'USD' | Currency filter |
| category_id | string | Category ID |
| account_id | string | Account ID |
| start_date | string | Start date |
| end_date | string | End date |

### Export Details
- Filename format: \`transactions_YYYY-MM-DD.csv\` (uses \`<code>\` element)
- Includes: date, type, amount, currency, category, account, description

### Export Button
- Style: \`btn btn-primary gap-2\`
- Icon: Download (16px) with \`stroke-current\`
- Attribute: \`download\` for browser download
- Link: Built from \`/api/transactions/export\` with filter params

### Responsive Design
- Container: \`max-w-4xl\` for content width
- Mobile: Natural block stacking
- Spacing: \`mb-6\` between sections

### Accessibility
- Info icon: \`aria-hidden="true"\` (decorative)
- Download icon: \`aria-hidden="true"\` (button has text)
- Semantic headings: h2, h3
- Export details: \`<ul>\` list elements
- Color contrast: DaisyUI classes ensure WCAG compliance

### Service Dependencies
- \`categoryService.findAll()\` - Active categories
- \`accountService.findAll()\` - Active accounts
        `,
      },
    },
  },
  argTypes: {
    hasFilters: { control: 'boolean' },
  },
};

export default meta;

const createExportPage = (args: { hasFilters?: boolean }): HTMLElement => {
  const { hasFilters = false } = args;

  const container = document.createElement('div');
  container.className = 'max-w-4xl mx-auto p-6 space-y-6';

  // Header
  const header = document.createElement('div');
  header.className = 'mb-6';
  header.innerHTML = `
    <h2 class="text-2xl font-bold text-base-content">Export Transactions to CSV</h2>
    <p class="text-neutral-500 mt-1">Download your transactions as a CSV file</p>
  `;
  container.appendChild(header);

  // Card
  const card = document.createElement('div');
  card.className = 'card bg-base-100 shadow border border-base-300';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  // Info Alert
  const alert = document.createElement('div');
  alert.className = 'alert alert-info mb-6';
  alert.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
    <div>
      <h3 class="font-bold">Export Options</h3>
      <p class="text-sm">Use filters below to select which transactions to export</p>
    </div>
  `;
  cardBody.appendChild(alert);

  // Filters Section
  const filtersSection = document.createElement('div');
  filtersSection.className = 'mb-6';
  filtersSection.innerHTML = `
    <h3 class="font-semibold mb-4">Filter Transactions</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-base-200 rounded-lg">
      <input type="text" placeholder="Search..." class="input input-bordered input-sm" ${hasFilters ? 'value="groceries"' : ''} />
      <select class="select select-bordered select-sm">
        <option>All Types</option>
        <option ${hasFilters ? 'selected' : ''}>Expense</option>
        <option>Income</option>
      </select>
      <select class="select select-bordered select-sm">
        <option>All Categories</option>
        <option ${hasFilters ? 'selected' : ''}>Food & Dining</option>
        <option>Transportation</option>
      </select>
    </div>
  `;
  cardBody.appendChild(filtersSection);

  // Export Details
  const detailsSection = document.createElement('div');
  detailsSection.className = 'border-t border-base-300 pt-6';
  detailsSection.innerHTML = `
    <h3 class="font-semibold mb-2">Export Details</h3>
    <ul class="text-sm text-neutral-500 space-y-1">
      <li>Filename format: <code class="bg-base-200 px-1 rounded">transactions_YYYY-MM-DD.csv</code></li>
      <li>Includes: date, type, amount, currency, category, account, description</li>
      <li>Uses current filter settings</li>
    </ul>
  `;
  cardBody.appendChild(detailsSection);

  // Export Button
  const buttonSection = document.createElement('div');
  buttonSection.className = 'mt-6';
  const exportUrl = hasFilters
    ? '/api/transactions/export?type=expense&category_id=1&search=groceries'
    : '/api/transactions/export';
  buttonSection.innerHTML = `
    <a href="${exportUrl}" download class="btn btn-primary gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" x2="12" y1="15" y2="3"/>
      </svg>
      Download CSV Export
    </a>
  `;
  cardBody.appendChild(buttonSection);

  card.appendChild(cardBody);
  container.appendChild(card);

  return container;
};

export const Default: StoryObj = {
  args: { hasFilters: false },
  render: (args) => createExportPage(args),
};

export const WithFilters: StoryObj = {
  args: { hasFilters: true },
  render: (args) => createExportPage(args),
  parameters: {
    docs: {
      description: {
        story: 'Export page with active filters that will be included in the export URL.',
      },
    },
  },
};
