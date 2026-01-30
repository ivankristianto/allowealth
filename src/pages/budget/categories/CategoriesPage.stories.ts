import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Budget/Categories',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
Category management page for expense and income categories with CRUD operations.

### Icon Specifications

| Icon | Component | Size | Class | Location |
|------|-----------|------|-------|----------|
| Plus | @lucide/astro | 16px | \`stroke-current\` | Add Category button |
| Search | @lucide/astro | 16px | \`stroke-current\` | Search submit button |
| X | @lucide/astro | 16px | \`stroke-current\` | Clear search button |
| Pencil | @lucide/astro | 16px | \`stroke-current\` | Edit button |
| Ban | @lucide/astro | 16px | \`stroke-current\` | Deactivate button |
| RefreshCw | @lucide/astro | 16px | \`stroke-current\` | Reactivate button |
| Tag | @lucide/astro | 24px | \`mx-auto mb-2 opacity-50\` | Empty state |

### Page Header
- Title: "Categories"
- Description: "Manage your expense and income categories for budget tracking"
- Add button: Plus icon with "Add Category" text

### Navigation Tabs

| Tab | Route |
|-----|-------|
| Profile | /profile |
| Categories | /budget/categories (active) |
| Assets | /assets |

### Status Filter Tabs
- Active: Shows count of active categories
- Inactive: Shows count of inactive categories

### Search Form
- Input placeholder: "Search categories..."
- Submit button: Search icon, \`aria-label="Search categories"\`
- Clear button: X icon, \`aria-label="Clear search"\` (conditional)

### Summary Stats (Active View Only)

| Stat | Description |
|------|-------------|
| Total Budget | Sum of expense category budgets |
| Categories | Count of active categories |

### Categories Table

| Column | Description |
|--------|-------------|
| Name | Category name |
| Type | Badge (Expense=error, Income=success) |
| Currency | IDR or USD |
| Allocation | Percentage allocation |
| Budget | Budget amount |
| Actions | Edit/Deactivate or Reactivate buttons |

### Action Buttons

| Status | Actions |
|--------|---------|
| Active | Edit (Pencil), Deactivate (Ban) |
| Inactive | Reactivate (RefreshCw with text) |

### Modals

#### Add/Edit Category Modal
- Fields: name, type, currency, percentage, budget_amount
- Error alert: \`role="alert"\`
- Buttons: Cancel, Save Category

#### Deactivate Confirmation
- Error alert: \`role="alert"\`
- Buttons: Cancel, Deactivate

#### Reactivate Confirmation
- Error alert: \`role="alert"\`
- Buttons: Cancel, Reactivate

### Empty State
- Icon: Tag (24px)
- Active message: "No categories found. Create your first category to get started."
- Inactive message: "No inactive categories"

### Accessibility

| Element | ARIA |
|---------|------|
| Edit button | \`aria-label="Edit category"\` |
| Deactivate button | \`aria-label="Deactivate category"\` |
| Reactivate button | \`aria-label="Reactivate category"\` |
| Search submit | \`aria-label="Search categories"\` |
| Clear search | \`aria-label="Clear search"\` |
| All icons | \`aria-hidden="true"\` |
| Error alerts | \`role="alert"\` |

### Data Attributes
- Container: \`data-categories-container\`
- Categories JSON: \`data-categories\`

### Query Parameters

| Parameter | Values |
|-----------|--------|
| show | active, inactive |
| search | Search query (case-insensitive) |

### Helper Functions

#### getTypeBadgeVariant
- expense -> "error"
- income -> "success"

#### getTypeLabel
- Capitalizes first letter of type

### Responsive Design
- Responsive filter tabs
- Responsive search form
- Table: \`overflow-x-auto\` for mobile

### Integration
- Layout: ProtectedLayout
- currentPath: "/budget/categories"
- title: "Categories - Settings"
- Client script: ./categories-client.ts
        `,
      },
    },
  },
  argTypes: {
    showInactive: { control: 'boolean' },
    hasCategories: { control: 'boolean' },
    searchQuery: { control: 'text' },
  },
};

export default meta;

const createCategoriesPage = (args: {
  showInactive?: boolean;
  hasCategories?: boolean;
  searchQuery?: string;
}): HTMLElement => {
  const { showInactive = false, hasCategories = true, searchQuery = '' } = args;

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto p-6 space-y-6';
  container.setAttribute('data-categories-container', '');

  // Header
  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
  header.innerHTML = `
    <div>
      <h2 class="text-2xl font-bold text-base-content">Categories</h2>
      <p class="text-sm text-neutral mt-1">Manage your expense and income categories for budget tracking</p>
    </div>
    <button class="btn btn-accent btn-sm gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
        <path d="M5 12h14"/>
        <path d="M12 5v14"/>
      </svg>
      Add Category
    </button>
  `;
  container.appendChild(header);

  // Navigation Tabs
  const navTabs = document.createElement('div');
  navTabs.className = 'tabs tabs-bordered';
  navTabs.innerHTML = `
    <a href="/profile" class="tab">Profile</a>
    <a href="/budget/categories" class="tab tab-active">Categories</a>
    <a href="/assets" class="tab">Assets</a>
  `;
  container.appendChild(navTabs);

  // Status Tabs and Search
  const controls = document.createElement('div');
  controls.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
  controls.innerHTML = `
    <div class="tabs tabs-boxed">
      <a href="/budget/categories?show=active" class="tab ${!showInactive ? 'tab-active' : ''}">Active (${hasCategories ? 5 : 0})</a>
      <a href="/budget/categories?show=inactive" class="tab ${showInactive ? 'tab-active' : ''}">Inactive (${hasCategories ? 2 : 0})</a>
    </div>
    <form action="/budget/categories" class="join">
      <input type="text" name="search" placeholder="Search categories..." class="input input-bordered input-sm join-item" value="${searchQuery}" />
      <button type="submit" class="btn btn-sm join-item" aria-label="Search categories">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
      </button>
      ${
        searchQuery
          ? `
        <a href="/budget/categories" class="btn btn-sm join-item" aria-label="Clear search">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </a>
      `
          : ''
      }
    </form>
  `;
  container.appendChild(controls);

  // Summary Stats (Active only)
  if (!showInactive && hasCategories) {
    const stats = document.createElement('div');
    stats.className = 'stats shadow border border-base-300';
    stats.innerHTML = `
      <div class="stat">
        <div class="stat-title">Total Budget</div>
        <div class="stat-value text-lg">Rp 8,000,000</div>
      </div>
      <div class="stat">
        <div class="stat-title">Categories</div>
        <div class="stat-value text-lg">5</div>
      </div>
    `;
    container.appendChild(stats);
  }

  // Table or Empty State
  if (!hasCategories) {
    const empty = document.createElement('div');
    empty.className = 'text-center py-12';
    empty.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2 opacity-50" aria-hidden="true">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
        <path d="M7 7h.01"/>
      </svg>
      <p class="text-base-content/60">${showInactive ? 'No inactive categories' : 'No categories found. Create your first category to get started.'}</p>
    `;
    container.appendChild(empty);
  } else {
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'overflow-x-auto';

    const table = document.createElement('table');
    table.className = 'table table-zebra';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Currency</th>
          <th>Allocation</th>
          <th>Budget</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${
          showInactive
            ? `
          <tr>
            <td>Old Category</td>
            <td><span class="badge badge-error badge-sm">Expense</span></td>
            <td>IDR</td>
            <td>0%</td>
            <td>Rp 0</td>
            <td>
              <button class="btn btn-ghost btn-xs gap-1" aria-label="Reactivate category">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
                Reactivate
              </button>
            </td>
          </tr>
        `
            : `
          <tr>
            <td>Food & Dining</td>
            <td><span class="badge badge-error badge-sm">Expense</span></td>
            <td>IDR</td>
            <td>25%</td>
            <td>Rp 2,000,000</td>
            <td class="flex gap-1">
              <button class="btn btn-ghost btn-xs" aria-label="Edit category">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
              </button>
              <button class="btn btn-ghost btn-xs" aria-label="Deactivate category">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m4.9 4.9 14.2 14.2"/>
                </svg>
              </button>
            </td>
          </tr>
          <tr>
            <td>Salary</td>
            <td><span class="badge badge-success badge-sm">Income</span></td>
            <td>IDR</td>
            <td>-</td>
            <td>-</td>
            <td class="flex gap-1">
              <button class="btn btn-ghost btn-xs" aria-label="Edit category">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
              </button>
              <button class="btn btn-ghost btn-xs" aria-label="Deactivate category">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stroke-current" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m4.9 4.9 14.2 14.2"/>
                </svg>
              </button>
            </td>
          </tr>
        `
        }
      </tbody>
    `;
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  }

  return container;
};

export const Default: StoryObj = {
  args: { showInactive: false, hasCategories: true, searchQuery: '' },
  render: (args) => createCategoriesPage(args),
};

export const InactiveView: StoryObj = {
  args: { showInactive: true, hasCategories: true, searchQuery: '' },
  render: (args) => createCategoriesPage(args),
};

export const WithSearch: StoryObj = {
  args: { showInactive: false, hasCategories: true, searchQuery: 'food' },
  render: (args) => createCategoriesPage(args),
};

export const EmptyActive: StoryObj = {
  args: { showInactive: false, hasCategories: false, searchQuery: '' },
  render: (args) => createCategoriesPage(args),
};

export const EmptyInactive: StoryObj = {
  args: { showInactive: true, hasCategories: false, searchQuery: '' },
  render: (args) => createCategoriesPage(args),
};
