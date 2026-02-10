/**
 * AssetDeleteConfirmModal Storybook Stories (Deactivate Account Modal)
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
      description: 'Name of the asset to deactivate',
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

interface AssetDeactivateModalArgs {
  assetName?: string;
  assetType?: string;
  balance?: number;
  currency?: 'IDR' | 'USD';
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

const createAssetDeactivateModal = (args: AssetDeactivateModalArgs): HTMLElement => {
  const {
    assetName = 'BCA Checking',
    assetType = 'Bank Account',
    balance = 0,
    currency = 'IDR',
    isLoading = false,
    hasError = false,
    errorMessage = 'Failed to deactivate account. Please try again.',
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
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-warning/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-warning">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              <line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
          </div>

          <!-- Title and description -->
          <div class="flex-1">
            <h2 class="text-2xl font-bold tracking-tight text-primary leading-none">
              Deactivate Account
            </h2>
            <p class="text-neutral text-sm mt-2 font-medium">
              Deactivate this account?
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

        <!-- Info message -->
        <div class="text-sm text-base-content/60 bg-base-200 p-3 rounded-xl">
          Once deactivated: hidden from active accounts, transaction history preserved, can be reactivated later by admin.
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
            class="btn btn-warning flex-1 h-14 rounded-full font-bold"
            ${isLoading ? 'disabled' : ''}
          >
            ${isLoading ? 'Deactivating...' : 'Deactivate'}
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
    balance: 0,
    currency: 'IDR',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeactivateModal(args),
};

export const USDAsset: StoryObj = {
  args: {
    assetName: 'Fidelity 401(k)',
    assetType: 'Stock',
    balance: 0,
    currency: 'USD',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeactivateModal(args),
};

export const Loading: StoryObj = {
  args: {
    assetName: 'BCA Savings',
    assetType: 'Bank Account',
    balance: 0,
    currency: 'IDR',
    isLoading: true,
    hasError: false,
  },
  render: (args) => createAssetDeactivateModal(args),
};

export const WithError: StoryObj = {
  args: {
    assetName: 'Investment Portfolio',
    assetType: 'Mutual Fund',
    balance: 0,
    currency: 'IDR',
    isLoading: false,
    hasError: true,
    errorMessage: 'Cannot deactivate account with non-zero balance. Transfer funds out first.',
  },
  render: (args) => createAssetDeactivateModal(args),
};

export const NonZeroBalance: StoryObj = {
  args: {
    assetName: 'Main Investment',
    assetType: 'Stock',
    balance: 1500000000,
    currency: 'IDR',
    isLoading: false,
    hasError: true,
    errorMessage:
      'Cannot deactivate account with balance of Rp 1,500,000,000. Transfer funds out first.',
  },
  render: (args) => createAssetDeactivateModal(args),
};

export const SmallBalance: StoryObj = {
  args: {
    assetName: 'Petty Cash',
    assetType: 'Other',
    balance: 0,
    currency: 'IDR',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAssetDeactivateModal(args),
};
