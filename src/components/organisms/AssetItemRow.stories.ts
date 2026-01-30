/**
 * AssetItemRow Storybook Stories
 *
 * P1: NOTE - This file duplicates the AssetItemRow.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AssetItemRow.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/AssetItemRow.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AssetItemRow',
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Asset name',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code',
    },
    balance: {
      control: 'number',
      description: 'Asset balance',
    },
    lastUpdated: {
      control: 'text',
      description: 'Last updated date string',
    },
  },
};

export default meta;

interface AssetItemRowArgs {
  id?: string;
  name?: string;
  currency?: 'IDR' | 'USD';
  balance?: number;
  lastUpdated?: string;
}

const createAssetItemRow = (args: AssetItemRowArgs): HTMLElement => {
  const {
    id = 'test-id',
    name = 'BCA Checking',
    currency = 'IDR',
    balance = 15250000,
    lastUpdated = '2/15/2026',
  } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-4xl bg-base-100 border border-base-200 rounded-xl';

  const currencyBadgeClasses =
    currency === 'IDR' ? 'bg-success/10 text-success' : 'bg-info/10 text-info';
  const currencyValueClasses = currency === 'IDR' ? 'text-success' : 'text-info';

  container.innerHTML = `
    <div class="p-4 lg:px-8 lg:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-base-100/50 transition-all group" data-asset-row="${id}">
      <div class="flex-1 min-w-0">
        <h4 class="text-base lg:text-lg font-bold text-base-content leading-none tracking-tight truncate">${name}</h4>
        <div class="flex items-center gap-3 mt-2 lg:mt-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${currencyBadgeClasses}">${currency}</span>
          <span class="text-xs text-base-content/50 font-medium tracking-tight">Updated: ${lastUpdated}</span>
        </div>
      </div>
      <div class="flex items-center gap-6 lg:gap-10">
        <div class="text-right sm:min-w-[140px]">
          <p class="text-lg lg:text-xl font-bold tracking-tight leading-none ${currencyValueClasses}">
            ${formatCurrency(balance, currency)}
          </p>
        </div>
        <div class="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <a href="#" class="p-2 text-base-content/50 hover:text-accent transition-all rounded-xl hover:bg-accent/10" title="View timeline">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </a>
          <a href="#" class="p-2 text-base-content/50 hover:text-success transition-all rounded-xl hover:bg-success/10" title="Edit asset">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
            </svg>
          </a>
          <button type="button" class="p-2 text-base-content/50 hover:text-error transition-all rounded-xl hover:bg-error/10" title="Delete asset">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {
    id: '1',
    name: 'BCA Checking',
    currency: 'IDR',
    balance: 15250000,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};

export const IDRAsset: StoryObj = {
  args: {
    id: '2',
    name: 'BCA Savings',
    currency: 'IDR',
    balance: 50450000,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};

export const USDAsset: StoryObj = {
  args: {
    id: '3',
    name: 'Chase Checking',
    currency: 'USD',
    balance: 5200,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};

export const LargeBalance: StoryObj = {
  args: {
    id: '4',
    name: 'Investment Portfolio',
    currency: 'IDR',
    balance: 1500000000,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};

export const SmallBalance: StoryObj = {
  args: {
    id: '5',
    name: 'Petty Cash',
    currency: 'IDR',
    balance: 500000,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};

export const LongName: StoryObj = {
  args: {
    id: '6',
    name: 'Bank Central Asia Savings Account for Emergency Fund',
    currency: 'IDR',
    balance: 25000000,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};

export const USDHighBalance: StoryObj = {
  args: {
    id: '7',
    name: 'Fidelity 401(k)',
    currency: 'USD',
    balance: 125000.5,
    lastUpdated: '2/15/2026',
  },
  render: (args) => createAssetItemRow(args),
};
