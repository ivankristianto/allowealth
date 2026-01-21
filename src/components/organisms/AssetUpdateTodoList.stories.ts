import type { Meta, StoryObj } from '@storybook/html';
import {
  mockAssetUpdateTodos,
  mockAssetUpdateTodosEmpty,
  mockAssetUpdateTodosAllUpdated,
} from '@/services/__tests__/mocks/dashboard-mocks';
import { IconStrings } from '../../../.storybook/lucide-icons';

// Use IconStrings for template literal usage
const { Calendar, Pencil, X, RefreshCw, Check } = IconStrings;

const meta: Meta = {
  title: 'Organisms/AssetUpdateTodoList',
  tags: ['autodocs'],
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

const getPriorityIcon = (priority: string): string => {
  switch (priority) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '✅';
  }
};

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
    <h2 class="text-lg font-semibold flex items-center gap-2">
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
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4 p-3 bg-base-200 rounded-lg animate-pulse';
      row.innerHTML = `
        <div class="w-8 h-8 bg-neutral-300 rounded-full"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-neutral-300 rounded w-3/4"></div>
          <div class="h-3 bg-neutral-300 rounded w-1/2"></div>
        </div>
      `;
      skeleton.appendChild(row);
    }
    card.appendChild(skeleton);
  } else if (assets.length === 0) {
    // Empty state
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-8';
    const checkIcon = Check.render(
      { size: 48, class: 'stroke-current text-neutral-400' },
      { 'aria-hidden': 'true' }
    );
    emptyState.innerHTML = `
      ${checkIcon}
      <h3 class="text-lg font-semibold mb-2">All assets up to date!</h3>
      <p class="text-neutral-500">You don't have any assets that need updating right now.</p>
    `;
    card.appendChild(emptyState);
  } else {
    // Asset list
    const list = document.createElement('div');
    list.className = 'space-y-2';

    assets.forEach((asset: any) => {
      const item = document.createElement('div');
      const bgColor =
        asset.priority === 'high'
          ? 'bg-red-50 border-red-200'
          : asset.priority === 'medium'
            ? 'bg-amber-50 border-amber-200'
            : asset.priority === 'low'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-base-200 border-base-300';

      item.className = `flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-sm ${bgColor}`;

      const pencilIcon = Pencil.render(
        { size: 16, class: 'stroke-current' },
        { 'aria-hidden': 'true' }
      );
      const xIcon = X.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' });

      item.innerHTML = `
        <div class="flex-shrink-0 text-2xl" aria-label="Priority: ${asset.priority}">
          ${getPriorityIcon(asset.priority)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium truncate">${asset.name}</span>
            <span class="badge badge-neutral badge-sm outline">${asset.type.replace('_', ' ')}</span>
          </div>
          <div class="flex items-center gap-3 text-sm text-neutral-600">
            <span class="font-mono font-medium">${formatCurrency(asset.balance, asset.currency)}</span>
            <span>•</span>
            <span class="${asset.priority === 'high' ? 'text-red-600 font-medium' : ''}">
              ${asset.daysSinceUpdate === 1 ? '1 day ago' : `${asset.daysSinceUpdate} days ago`}
            </span>
          </div>
        </div>
        <button class="flex-shrink-0 btn btn-ghost btn-sm" aria-label="Update ${asset.name}">
          ${pencilIcon}
        </button>
        <button class="flex-shrink-0 btn btn-ghost btn-sm text-neutral-400 hover:text-neutral-600" aria-label="Dismiss ${asset.name} reminder">
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
      <button class="btn btn-primary btn-sm w-full gap-2">
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
};

// Empty state - all assets up to date
export const AllUpdated: StoryObj = {
  args: {
    assets: mockAssetUpdateTodosAllUpdated,
    loading: false,
  },
  render: (args) => createAssetUpdateTodoList(args),
};

// Empty state - no assets
export const Empty: StoryObj = {
  args: {
    assets: mockAssetUpdateTodosEmpty,
    loading: false,
  },
  render: (args) => createAssetUpdateTodoList(args),
};

// Loading state
export const Loading: StoryObj = {
  args: {
    assets: [],
    loading: true,
  },
  render: (args) => createAssetUpdateTodoList(args),
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
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(
        createAssetUpdateTodoList({ assets: state.assets, loading: state.loading })
      );
      container.appendChild(section);
    });

    return container;
  },
};
