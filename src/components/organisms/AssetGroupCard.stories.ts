/**
 * AssetGroupCard Storybook Stories
 *
 * P1: NOTE - This file duplicates the AssetGroupCard.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AssetGroupCard.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/AssetGroupCard.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AssetGroupCard',
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'text',
      description: 'Asset type name',
    },
    count: {
      control: 'number',
      description: 'Number of assets in group',
    },
    totalIdr: {
      control: 'number',
      description: 'Total value in IDR',
    },
    totalUsd: {
      control: 'number',
      description: 'Total value in USD',
    },
    defaultExpanded: {
      control: 'boolean',
      description: 'Whether group starts expanded',
    },
  },
};

export default meta;

interface AssetItem {
  id: string;
  name: string;
  currency: 'IDR' | 'USD';
  balance: number;
  lastUpdated: string;
}

interface GroupCardArgs {
  type?: string;
  count?: number;
  totalIdr?: number;
  totalUsd?: number;
  defaultExpanded?: boolean;
  groupId?: string;
  assets?: AssetItem[];
}

const createAssetRow = (asset: AssetItem): string => {
  const currencyBadgeClasses =
    asset.currency === 'IDR' ? 'bg-success/10 text-success' : 'bg-info/10 text-info';
  const currencyValueClasses = asset.currency === 'IDR' ? 'text-success' : 'text-info';

  return `
    <div class="p-4 lg:px-8 lg:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-base-100/50 transition-all group" data-asset-row="${asset.id}">
      <div class="flex-1 min-w-0">
        <h4 class="text-base lg:text-lg font-bold text-base-content leading-none tracking-tight truncate">${asset.name}</h4>
        <div class="flex items-center gap-3 mt-2 lg:mt-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${currencyBadgeClasses}">${asset.currency}</span>
          <span class="text-xs text-base-content/50 font-medium tracking-tight">Updated: ${asset.lastUpdated}</span>
        </div>
      </div>
      <div class="flex items-center gap-6 lg:gap-10">
        <div class="text-right sm:min-w-[140px]">
          <p class="text-lg lg:text-xl font-bold tracking-tight leading-none ${currencyValueClasses}">
            ${formatCurrency(asset.balance, asset.currency)}
          </p>
        </div>
        <div class="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <button class="p-2 text-base-content/50 hover:text-accent transition-all rounded-xl hover:bg-accent/10" title="View timeline">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </button>
          <button class="p-2 text-base-content/50 hover:text-success transition-all rounded-xl hover:bg-success/10" title="Edit asset">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
          </button>
          <button class="p-2 text-base-content/50 hover:text-error transition-all rounded-xl hover:bg-error/10" title="Delete asset">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
};

const createGroupCard = (args: GroupCardArgs): HTMLElement => {
  const {
    type = 'Bank Account',
    count = 5,
    totalIdr = 74200000,
    totalUsd = 8350,
    defaultExpanded = true,
    groupId = 'bank_account',
    assets = [],
  } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-4xl';

  const subtitle = `Managing your ${type.toLowerCase()} holdings`;
  const contentStyle = defaultExpanded ? '' : 'max-height: 0px; opacity: 0; overflow: hidden;';
  const iconRotation = defaultExpanded ? 'rotate-0' : '-rotate-180';

  container.innerHTML = `
    <div class="bg-base-100 rounded-3xl border border-base-300 shadow-sm overflow-hidden transition-all duration-300" data-asset-group="${groupId}">
      <button
        type="button"
        class="w-full p-6 lg:px-8 lg:py-6 flex items-center justify-between text-left transition-colors hover:bg-base-100/80 group"
        data-group-toggle="${groupId}"
        aria-expanded="${defaultExpanded}"
        aria-controls="group-content-${groupId}"
      >
        <div>
          <div class="flex items-center gap-3">
            <h3 class="text-lg lg:text-xl font-bold text-base-content tracking-tight leading-none">${type}</h3>
            <span class="px-2 py-0.5 bg-base-200 text-base-content/70 rounded-lg text-[10px] font-bold leading-none">${count}</span>
          </div>
          <p class="text-xs font-medium text-base-content/50 mt-2">${subtitle}</p>
        </div>
        <div class="flex items-center gap-6 lg:gap-8">
          <div class="text-right hidden sm:block">
            ${totalIdr > 0 ? `<p class="text-sm font-bold text-success leading-none">${formatCurrency(totalIdr, 'IDR')}</p>` : ''}
            ${totalUsd > 0 ? `<p class="text-sm font-bold text-info leading-none ${totalIdr > 0 ? 'mt-1.5' : ''}">${formatCurrency(totalUsd, 'USD')}</p>` : ''}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content/40 transition-transform duration-300 ${iconRotation}" data-group-icon="${groupId}">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </div>
      </button>
      <div
        id="group-content-${groupId}"
        class="divide-y divide-base-200 border-t border-base-200 transition-all duration-300 ease-in-out"
        data-group-content="${groupId}"
        data-expanded="${defaultExpanded}"
        style="${contentStyle}"
      >
        ${assets.map((asset) => createAssetRow(asset)).join('')}
      </div>
    </div>
  `;

  return container;
};

// Mock assets for stories
const bankAccountAssets: AssetItem[] = [
  { id: '1', name: 'BCA Checking', currency: 'IDR', balance: 15250000, lastUpdated: '2/15/2026' },
  { id: '2', name: 'BCA Savings', currency: 'IDR', balance: 50450000, lastUpdated: '2/15/2026' },
  { id: '3', name: 'Chase Checking', currency: 'USD', balance: 5200, lastUpdated: '2/15/2026' },
  { id: '4', name: 'DBS Savings', currency: 'USD', balance: 3150, lastUpdated: '2/15/2026' },
  { id: '5', name: 'Mandiri Savings', currency: 'IDR', balance: 8500000, lastUpdated: '2/15/2026' },
];

const stockAssets: AssetItem[] = [
  { id: '1', name: 'AAPL', currency: 'USD', balance: 15000, lastUpdated: '2/15/2026' },
  { id: '2', name: 'BBCA', currency: 'IDR', balance: 250000000, lastUpdated: '2/15/2026' },
  { id: '3', name: 'GOOGL', currency: 'USD', balance: 8500, lastUpdated: '2/15/2026' },
];

export const Default: StoryObj = {
  args: {
    type: 'Bank Account',
    count: 5,
    totalIdr: 74200000,
    totalUsd: 8350,
    defaultExpanded: true,
    groupId: 'bank_account',
    assets: bankAccountAssets,
  },
  render: (args) => createGroupCard(args),
};

export const Collapsed: StoryObj = {
  args: {
    type: 'Bank Account',
    count: 5,
    totalIdr: 74200000,
    totalUsd: 8350,
    defaultExpanded: false,
    groupId: 'bank_account',
    assets: bankAccountAssets,
  },
  render: (args) => createGroupCard(args),
};

export const StockGroup: StoryObj = {
  args: {
    type: 'Stock',
    count: 3,
    totalIdr: 250000000,
    totalUsd: 23500,
    defaultExpanded: true,
    groupId: 'stock',
    assets: stockAssets,
  },
  render: (args) => createGroupCard(args),
};

export const SingleAsset: StoryObj = {
  args: {
    type: 'Mutual Fund',
    count: 1,
    totalIdr: 25700000,
    totalUsd: 0,
    defaultExpanded: true,
    groupId: 'mutual_fund',
    assets: [
      {
        id: '1',
        name: 'Reksa Dana BCAP',
        currency: 'IDR',
        balance: 25700000,
        lastUpdated: '2/15/2026',
      },
    ],
  },
  render: (args) => createGroupCard(args),
};

export const OnlyIDR: StoryObj = {
  args: {
    type: 'Bond',
    count: 2,
    totalIdr: 100000000,
    totalUsd: 0,
    defaultExpanded: true,
    groupId: 'bond',
    assets: [
      { id: '1', name: 'ORI021', currency: 'IDR', balance: 50000000, lastUpdated: '2/15/2026' },
      { id: '2', name: 'SBN012', currency: 'IDR', balance: 50000000, lastUpdated: '2/15/2026' },
    ],
  },
  render: (args) => createGroupCard(args),
};

export const OnlyUSD: StoryObj = {
  args: {
    type: 'Cryptocurrency',
    count: 2,
    totalIdr: 0,
    totalUsd: 10000,
    defaultExpanded: true,
    groupId: 'crypto',
    assets: [
      { id: '1', name: 'Bitcoin', currency: 'USD', balance: 7500, lastUpdated: '2/15/2026' },
      { id: '2', name: 'Ethereum', currency: 'USD', balance: 2500, lastUpdated: '2/15/2026' },
    ],
  },
  render: (args) => createGroupCard(args),
};
