/**
 * AssetDeleteConfirmModal Storybook Stories
 *
 * P1: NOTE - This file duplicates the AssetDeleteConfirmModal.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AssetDeleteConfirmModal.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/AssetDeleteConfirmModal.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AssetDeleteConfirmModal',
  tags: ['autodocs'],
  argTypes: {
    assetName: {
      control: 'text',
      description: 'Name of the asset to delete',
    },
    assetType: {
      control: 'text',
      description: 'Type of the asset',
    },
    balance: {
      control: 'number',
      description: 'Asset balance',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    hasError: {
      control: 'boolean',
      description: 'Show error state',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display',
    },
  },
};

export default meta;

interface AssetDeleteModalArgs {
  assetName?: string;
  assetType?: string;
  balance?: number;
  currency?: 'IDR' | 'USD';
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

const createAssetDeleteModal = (args: AssetDeleteModalArgs): HTMLElement => {
  const {
    assetName = 'BCA Checking',
    assetType = 'Bank Account',
    balance = 15250000,
    currency = 'IDR',
    isLoading = false,
    hasError = false,
    errorMessage = 'Failed to delete asset. Please try again.',
  } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-md mx-auto';

  const currencyBadgeClasses =
    currency === 'IDR' ? 'bg-success/10 text-success' : 'bg-info/10 text-info';
  const balanceClasses = currency === 'IDR' ? 'text-success' : 'text-info';

  container.innerHTML = `
    <div class="bg-base-100 rounded-3xl shadow-xl border border-base-300 p-6">
      <div class="flex flex-col gap-6">
        <!-- Header section -->
        <div class="flex items-center gap-4">
          <!-- Icon -->
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-error/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </div>

          <!-- Title and description -->
          <div class="flex-1">
            <h2 class="text-2xl font-bold tracking-tight text-primary leading-none">
              Delete Asset
            </h2>
            <p class="text-neutral text-sm mt-2 font-medium">
              Are you sure you want to delete this asset?
            </p>
          </div>
        </div>

        <!-- Asset details section -->
        <div class="bg-base-200 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-bold text-base-content">${assetName}</p>
              <p class="text-xs text-base-content/50 mt-1">${assetType}</p>
            </div>
            <div class="text-right">
              <p class="font-bold ${balanceClasses}">${formatCurrency(balance, currency)}</p>
              <span class="inline-block px-2 py-0.5 rounded-md text-xs font-bold tracking-wider uppercase ${currencyBadgeClasses}">
                ${currency}
              </span>
            </div>
          </div>
        </div>

        <!-- Warning message -->
        <div class="text-sm text-error/80 bg-error/5 p-3 rounded-xl">
          This action cannot be undone. All balance history for this asset will also be deleted.
        </div>

        <!-- Error message -->
        ${
          hasError
            ? `
          <div class="alert alert-error text-sm rounded-xl" role="alert">
            ${errorMessage}
          </div>
        `
            : ''
        }

        <!-- Actions -->
        <div class="flex gap-4 pt-2">
          <button
            type="button"
            class="btn btn-ghost flex-1 h-14 rounded-full font-bold text-base-content hover:bg-base-200"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-error flex-1 h-14 rounded-full font-bold"
            ${isLoading ? 'disabled' : ''}
          >
            ${isLoading ? 'Deleting...' : 'Delete Asset'}
          </button>
        </div>
      </div>
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {
    assetName: 'BCA Checking',
    assetType: 'Bank Account',
    balance: 15250000,
    currency: 'IDR',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeleteModal(args),
};

export const USDAsset: StoryObj = {
  args: {
    assetName: 'Fidelity 401(k)',
    assetType: 'Stock',
    balance: 125000.5,
    currency: 'USD',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeleteModal(args),
};

export const Loading: StoryObj = {
  args: {
    assetName: 'BCA Savings',
    assetType: 'Bank Account',
    balance: 50000000,
    currency: 'IDR',
    isLoading: true,
    hasError: false,
  },
  render: (args) => createAssetDeleteModal(args),
};

export const WithError: StoryObj = {
  args: {
    assetName: 'Investment Portfolio',
    assetType: 'Mutual Fund',
    balance: 100000000,
    currency: 'IDR',
    isLoading: false,
    hasError: true,
    errorMessage: 'This asset cannot be deleted because it has linked transactions.',
  },
  render: (args) => createAssetDeleteModal(args),
};

export const LargeBalance: StoryObj = {
  args: {
    assetName: 'Main Investment',
    assetType: 'Stock',
    balance: 1500000000,
    currency: 'IDR',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeleteModal(args),
};

export const SmallBalance: StoryObj = {
  args: {
    assetName: 'Petty Cash',
    assetType: 'Other',
    balance: 500000,
    currency: 'IDR',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeleteModal(args),
};
