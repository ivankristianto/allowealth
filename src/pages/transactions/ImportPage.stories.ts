import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Transactions/Import',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
CSV Import page for bulk importing transactions from a CSV file.

### Icon Specifications

| Icon | Component | Size | Class | Location |
|------|-----------|------|-------|----------|
| Info | @lucide/astro | 16px | \`shrink-0\` | CSV format requirements alert |
| ArrowRight | @lucide/astro | 16px | \`stroke-current\` | Download template link |

### Page Structure

| Section | Description |
|---------|-------------|
| Header | Title "Import Transactions from CSV" with description |
| Requirements Alert | CSV format info with Info icon |
| Import Form | CSVImportForm component |
| Template Section | Download template link with ArrowRight icon |

### CSV Format Requirements Alert
- Style: \`alert-info mb-6\`
- Icon: Info (16px) with \`shrink-0\`
- Heading: "CSV Format Requirements" (h3, font-bold)
- Required columns list: date, type, amount, currency, category, account, description

### Required CSV Columns

| Column | Description |
|--------|-------------|
| date | Transaction date |
| type | expense or income |
| amount | Numeric value |
| currency | IDR or USD |
| category | Category name |
| account | Account/account name |
| description | Transaction description |

### CSVImportForm Integration
- Prop: \`action="/transactions/import"\`
- Handles CSV file upload logic

### Template Download Section
- Separator: \`border-t border-base-300\`
- Spacing: \`mt-6 pt-6\`
- Heading: "Need a template?" (h3, font-semibold)
- Link style: \`btn btn-outline btn-sm\`
- Icon: ArrowRight (16px) with \`stroke-current\`
- Target: \`/transactions/template.csv\`

### Responsive Design
- Container: \`max-w-4xl\` for content width
- Mobile: Natural block stacking
- Button: \`btn-sm\` for appropriate touch targets

### Accessibility
- Info icon: \`aria-hidden="true"\` (decorative)
- ArrowRight icon: \`aria-hidden="true"\` (link has text)
- Semantic headings: h2, h3
- Requirements list: \`<ul class="list-disc list-inside">\`
- DaisyUI alert classes for WCAG compliant colors

### Spacing
- Alert margin: \`mb-6\`
- Heading margin: \`mb-2\`
- Section separator: \`mt-6 pt-6\`

### Future Features (Phase 2/3)
- CSV file upload
- Column parsing
- Column mapping
- Validation preview
        `,
      },
    },
  },
};

export default meta;

const createImportPage = (): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'max-w-4xl mx-auto p-6 space-y-6';

  // Header
  const header = document.createElement('div');
  header.className = 'mb-6';
  header.innerHTML = `
    <h2 class="text-2xl font-bold text-base-content">Import Transactions from CSV</h2>
    <p class="text-neutral-500 mt-1">Bulk import transactions from a CSV file</p>
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
      <h3 class="font-bold">CSV Format Requirements</h3>
      <p class="text-sm mb-2">Your CSV file must include the following columns:</p>
      <ul class="list-disc list-inside text-sm">
        <li>date - Transaction date (YYYY-MM-DD)</li>
        <li>type - expense or income</li>
        <li>amount - Numeric value</li>
        <li>currency - IDR or USD</li>
        <li>category - Category name</li>
        <li>account - Account/account name</li>
        <li>description - Transaction description</li>
      </ul>
    </div>
  `;
  cardBody.appendChild(alert);

  // Import Form Placeholder
  const formSection = document.createElement('div');
  formSection.className = 'mb-6';
  formSection.innerHTML = `
    <div class="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto text-base-content/30 mb-4" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" x2="12" y1="3" y2="15"/>
      </svg>
      <p class="text-base-content/60 mb-2">Drag and drop your CSV file here</p>
      <p class="text-sm text-base-content/40 mb-4">or</p>
      <input type="file" accept=".csv" class="file-input file-input-bordered file-input-sm" />
    </div>
  `;
  cardBody.appendChild(formSection);

  // Template Download Section
  const templateSection = document.createElement('div');
  templateSection.className = 'mt-6 pt-6 border-t border-base-300';
  templateSection.innerHTML = `
    <h3 class="font-semibold mb-2">Need a template?</h3>
    <p class="text-sm text-neutral-500 mb-4">Download a sample CSV file to see the expected format</p>
    <a href="/transactions/template.csv" class="btn btn-outline btn-sm gap-2">
      Download CSV Template
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true">
        <path d="M5 12h14"/>
        <path d="m12 5 7 7-7 7"/>
      </svg>
    </a>
  `;
  cardBody.appendChild(templateSection);

  card.appendChild(cardBody);
  container.appendChild(card);

  return container;
};

export const Default: StoryObj = {
  render: () => createImportPage(),
};
