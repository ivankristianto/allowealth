import type { Meta, StoryObj } from '@storybook/html';
import {
  mockAssetUpdateTodos,
  mockAssetUpdateTodosEmpty,
  mockAssetUpdateTodosAllUpdated,
} from '@/services/__tests__/mocks/dashboard-mocks';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Calendar, Pencil, X, RefreshCw, Check } = IconRenderers;

const meta: Meta = {
  title: 'Organisms/AssetUpdateTodoList',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment
| Property | Value | Class |
|----------|-------|-------|
| Header Icon | Calendar | size={20}, text-warning |
| Edit Button Icon | Pencil | size={16}, stroke-current |
| Dismiss Button Icon | X | size={16}, stroke-current |
| Update All Icon | RefreshCw | size={16}, stroke-current |
| Empty State Icon | Check | size={48}, text-success |

### Layout
- Card container with border and rounded corners
- Header with Calendar icon and count badge
- Scrollable list with priority-sorted items
- "Update All Assets" button at bottom with divider

### Priority System
| Priority | Background | Border | Icon |
|----------|------------|--------|------|
| High | bg-error/10 | border-error/20 | Badge error |
| Medium | bg-warning/10 | border-warning/20 | Badge warning |
| Low | bg-success/10 | border-success/20 | Badge success |
| None | bg-base-200 | border-base-300 | Badge neutral |

### Accessibility
- All icons have aria-hidden="true" (decorative)
- Action buttons have aria-label for screen readers
- Priority indicator has role="img" with aria-label
- List has role="list" with aria-label="Assets needing updates"
- Loading skeleton has role="status", aria-live="polite"

### Data Display
- Asset name with truncate for overflow
- Asset type badge (Bank Account, Mutual Fund, etc.)
- Balance formatted with formatCurrency()
- Days since update with singular/plural handling
- High priority items show "X days ago" in text-error

### Responsive Design
- Full-width card layout on mobile
- Touch targets minimum 44x44px (btn-sm)
- Stacked asset info in single column
        `,
      },
    },
  },
  argTypes: {
    assets: {
      control: 'object',
      description: 'Array of asset items needing update',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading skeleton state',
    },
  },
};

export default meta;

const getPriorityBadge = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'badge-error';
    case 'medium':
      return 'badge-warning';
    case 'low':
      return 'badge-success';
    default:
      return 'badge-neutral';
  }
};

const getPriorityBackground = (priority: string): string => {
  // Updated to use DaisyUI semantic colors with opacity variants
  switch (priority) {
    case 'high':
      return 'bg-error/10 border-error/20 hover:bg-error/20';
    case 'medium':
      return 'bg-warning/10 border-warning/20 hover:bg-warning/20';
    case 'low':
      return 'bg-success/10 border-success/20 hover:bg-success/20';
    default:
      return 'bg-base-200 border-base-300 hover:bg-base-100';
  }
};

const formatCurrency = (amount: number, currency: 'IDR' | 'USD'): string => {
  const config =
    currency === 'IDR'
      ? { locale: 'id-ID', symbol: 'Rp', decimals: 0 }
      : { locale: 'en-US', symbol: '$', decimals: 2 };

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
};

const getAssetTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    bank_account: 'Bank Account',
    mutual_fund: 'Mutual Fund',
    bond: 'Bond',
    crypto: 'Crypto',
    stock: 'Stock',
    other: 'Other',
  };
  return labels[type] || type;
};

const createAssetUpdateTodoList = (args: { assets?: object[]; loading?: boolean }): HTMLElement => {
  const { assets = mockAssetUpdateTodos, loading = false } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100';

  const card = document.createElement('div');
  card.className = 'border rounded-lg p-6 bg-base-100';

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';
  const calendarIcon = Calendar.render(
    { size: 20, class: 'stroke-current text-warning' },
    { 'aria-hidden': 'true' }
  );
  header.innerHTML = `
    <h2 class="text-lg font-semibold flex items-center gap-2 text-base-content">
      ${calendarIcon}
      Asset Updates Needed
    </h2>
    ${!loading && assets.length > 0 ? `<span class="badge badge-warning badge-sm">${assets.length}</span>` : ''}
  `;
  card.appendChild(header);

  if (loading) {
    // Loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'space-y-3';
    skeleton.setAttribute('role', 'status');
    skeleton.setAttribute('aria-live', 'polite');
    skeleton.setAttribute('aria-label', 'Loading asset updates');
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4 p-3 bg-base-200 rounded-lg animate-pulse';
      row.innerHTML = `
        <div class="w-8 h-8 bg-base-300 rounded-full" aria-hidden="true"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-base-300 rounded w-3/4" aria-hidden="true"></div>
          <div class="h-3 bg-base-300 rounded w-1/2" aria-hidden="true"></div>
        </div>
      `;
      skeleton.appendChild(row);
    }
    card.appendChild(skeleton);
  } else if (assets.length === 0) {
    // Empty state - all assets up to date
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-8';
    const checkIcon = Check.render(
      { size: 48, class: 'stroke-current text-success' },
      { 'aria-hidden': 'true' }
    );
    emptyState.innerHTML = `
      ${checkIcon}
      <h3 class="text-lg font-semibold mb-2 text-base-content">All assets up to date!</h3>
      <p class="text-base-content/60">You don't have any assets that need updating right now.</p>
    `;
    card.appendChild(emptyState);
  } else {
    // Asset list
    const list = document.createElement('div');
    list.className = 'space-y-2';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', 'Assets needing updates');

    assets.forEach((asset: any) => {
      const item = document.createElement('div');
      const bgColor = getPriorityBackground(asset.priority);

      item.className = `flex items-center gap-4 p-3 rounded-lg border transition-all ${bgColor}`;

      const pencilIcon = Pencil.render(
        { size: 16, class: 'stroke-current' },
        { 'aria-hidden': 'true' }
      );
      const xIcon = X.render(
        { size: 16, class: 'stroke-current text-base-content/60' },
        { 'aria-hidden': 'true' }
      );

      const priorityLabel =
        asset.priority === 'high'
          ? 'High'
          : asset.priority === 'medium'
            ? 'Medium'
            : asset.priority === 'low'
              ? 'Low'
              : 'OK';

      item.innerHTML = `
        <div class="shrink-0" role="status" aria-label="Priority: ${asset.priority}">
          <span class="badge ${getPriorityBadge(asset.priority)} badge-sm">${priorityLabel}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium truncate text-base-content">${asset.name}</span>
            <span class="badge badge-neutral badge-sm outline">${getAssetTypeLabel(asset.type)}</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-base-content/60">
            <span class="font-mono font-medium">${formatCurrency(asset.balance, asset.currency)}</span>
            <span aria-hidden="true">•</span>
            <span class="${asset.priority === 'high' ? 'text-error font-medium' : ''}">
              ${asset.daysSinceUpdate === 1 ? '1 day ago' : `${asset.daysSinceUpdate} days ago`}
            </span>
          </div>
        </div>
        <button class="shrink-0 btn btn-ghost btn-sm hover:bg-base-100" aria-label="Update ${asset.name}">
          ${pencilIcon}
        </button>
        <button class="flex-shrink-0 btn btn-ghost btn-sm text-base-content/60 hover:text-base-content hover:bg-base-100" aria-label="Dismiss ${asset.name} reminder">
          ${xIcon}
        </button>
      `;
      list.appendChild(item);
    });

    card.appendChild(list);

    // Update all button
    const updateAllBtn = document.createElement('div');
    updateAllBtn.className = 'mt-4 pt-4 border-t border-base-300';
    const refreshCwIcon = RefreshCw.render(
      { size: 16, class: 'stroke-current' },
      { 'aria-hidden': 'true' }
    );
    updateAllBtn.innerHTML = `
      <button class="btn btn-accent btn-sm w-full gap-2" aria-label="Update all assets">
        ${refreshCwIcon}
        Update All Assets
      </button>
    `;
    card.appendChild(updateAllBtn);
  }

  container.appendChild(card);
  return container;
};

// Default state with pending updates
export const Default: StoryObj = {
  args: {
    assets: mockAssetUpdateTodos,
    loading: false,
  },
  render: (args) => createAssetUpdateTodoList(args),
  parameters: {
    docs: {
      description: {
        story:
          'Default state showing assets that need updating. Uses semantic DaisyUI badge colors (error/warning/success) for priority indicators.',
      },
    },
  },
};

// Empty state - all assets up to date
export const AllUpdated: StoryObj = {
  args: {
    assets: mockAssetUpdateTodosAllUpdated,
    loading: false,
  },
  render: (args) => createAssetUpdateTodoList(args),
  parameters: {
    docs: {
      description: {
        story: 'Empty state when all assets are up to date.',
      },
    },
  },
};

// Empty state - no assets
export const Empty: StoryObj = {
  args: {
    assets: mockAssetUpdateTodosEmpty,
    loading: false,
  },
  render: (args) => createAssetUpdateTodoList(args),
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no assets exist in the system.',
      },
    },
  },
};

// Loading state
export const Loading: StoryObj = {
  args: {
    assets: [],
    loading: true,
  },
  render: (args) => createAssetUpdateTodoList(args),
  parameters: {
    docs: {
      description: {
        story: 'Loading skeleton state while fetching asset data.',
      },
    },
  },
};

// All states together
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-8';

    const states = [
      { title: 'Pending Updates', assets: mockAssetUpdateTodos },
      { title: 'All Updated', assets: mockAssetUpdateTodosAllUpdated },
      { title: 'No Assets', assets: mockAssetUpdateTodosEmpty },
      { title: 'Loading', assets: [], loading: true },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4 text-base-content">${state.title}</h3>`;
      section.appendChild(
        createAssetUpdateTodoList({ assets: state.assets, loading: state.loading })
      );
      container.appendChild(section);
    });

    return container;
  },
};
