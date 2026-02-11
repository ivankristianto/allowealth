/**
 * AssetItemRow Storybook Stories
 *
 * P1: NOTE - This file duplicates the AssetItemRow.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AssetItemRow.astro, ensure this file is updated to match.
 *
 * @see src/components/molecules/AssetItemRow.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Molecules/AssetItemRow',
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

// Lucide SVG icons used in the component
const chevronDownSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content/30 shrink-0 transition-transform duration-200"><path d="m6 9 6 6 6-6"/></svg>`;

const pencilSvg = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`;

const trendingUpSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;

const ellipsisSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`;

const powerOffSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`;

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
    <div class="p-4 lg:px-8 lg:py-5 hover:bg-base-100/50 transition-all group cursor-pointer" data-asset-row="${id}" role="button" aria-expanded="false">
      <!-- Desktop Layout -->
      <div class="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
        ${chevronDownSvg}
        <!-- Asset Info -->
        <div class="flex-1 min-w-0">
          <h4 class="text-base lg:text-lg font-bold text-base-content leading-none tracking-tight truncate">${name}</h4>
          <div class="flex items-center gap-3 mt-2 lg:mt-3">
            <span class="px-2 py-0.5 rounded-md text-xs font-bold tracking-wider uppercase ${currencyBadgeClasses}">${currency}</span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tracking-wider uppercase bg-base-200 text-base-content/50">
              Updated: ${lastUpdated}
            </span>
          </div>
        </div>
        <!-- Balance and Actions -->
        <div class="flex items-center gap-6 lg:gap-10">
          <!-- Balance with inline update pencil -->
          <div class="text-right sm:min-w-[140px]">
            <div class="flex items-center justify-end gap-1">
              <p class="text-lg lg:text-xl font-bold tracking-tight leading-none ${currencyValueClasses}">
                ${formatCurrency(balance, currency)}
              </p>
              <button type="button" class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-base-content/40 hover:text-accent hover:bg-accent/10 transition-colors" aria-label="Update balance">
                ${pencilSvg(14)}
              </button>
            </div>
          </div>
          <!-- Action Buttons -->
          <div class="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <!-- View Timeline -->
            <div class="tooltip tooltip-bottom" data-tip="View timeline">
              <button type="button" class="p-2 min-h-11 min-w-11 flex items-center justify-center text-base-content/50 hover:text-accent transition-all rounded-xl hover:bg-accent/10" aria-label="View timeline">
                ${trendingUpSvg}
              </button>
            </div>
            <!-- Manage Menu -->
            <div class="dropdown dropdown-end" data-dropdown-menu>
              <div class="tooltip tooltip-bottom" data-tip="More actions">
                <button type="button" tabindex="0" class="p-2 min-h-11 min-w-11 flex items-center justify-center text-base-content/50 hover:text-base-content transition-all rounded-xl hover:bg-base-200" aria-label="More actions" aria-haspopup="menu">
                  ${ellipsisSvg}
                </button>
              </div>
              <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-44 border border-base-300" role="menu">
                <li role="none">
                  <button type="button" role="menuitem" class="flex items-center gap-2" aria-label="Edit details">
                    ${pencilSvg(16)}
                    Edit Details
                  </button>
                </li>
                <li role="none">
                  <button type="button" role="menuitem" class="flex items-center gap-2 text-warning" aria-label="Deactivate">
                    ${powerOffSvg}
                    Deactivate
                  </button>
                </li>
              </ul>
            </div>
          </div>
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
