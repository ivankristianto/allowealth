/**
 * AccountFormModal Storybook Stories
 *
 * P1: NOTE - This file duplicates the AccountFormModal.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AccountFormModal.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/AccountFormModal.astro
 */
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/AccountFormModal',
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['add', 'edit'],
      description: 'Modal mode (add or edit)',
    },
    accountName: {
      control: 'text',
      description: 'Pre-filled account name (edit mode)',
    },
    accountType: {
      control: 'select',
      options: ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'],
      description: 'Pre-selected account type',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Selected currency',
    },
    balance: {
      control: 'text',
      description: 'Initial/current balance',
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

interface AccountFormModalArgs {
  mode?: 'add' | 'edit';
  accountName?: string;
  accountType?: string;
  currency?: 'IDR' | 'USD';
  balance?: string;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

const accountTypeLabels: Record<string, string> = {
  bank_account: 'Bank Account',
  mutual_fund: 'Mutual Fund',
  bond: 'Bond',
  crypto: 'Cryptocurrency',
  stock: 'Stock',
  other: 'Other',
};

const createAccountFormModal = (args: AccountFormModalArgs): HTMLElement => {
  const {
    mode = 'add',
    accountName = '',
    accountType = 'bank_account',
    currency = 'IDR',
    balance = '',
    isLoading = false,
    hasError = false,
    errorMessage = 'An error occurred while saving the account.',
  } = args;

  const isEditMode = mode === 'edit';
  const title = isEditMode ? 'Edit Account' : 'Register Account';
  const subtitle = isEditMode
    ? 'Update the details of your account.'
    : 'Add a new account, fund or security to your portfolio.';
  const submitLabel = isEditMode ? 'Save Changes' : 'Register Account';

  const container = document.createElement('div');
  container.className = 'w-full max-w-lg mx-auto';

  container.innerHTML = `
    <div class="bg-base-100 rounded-3xl shadow-xl border border-base-300 p-6 lg:p-8">
      <div class="space-y-6">
        <!-- Header with icon -->
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10 text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
              <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold tracking-tight text-base-content leading-none">${title}</h2>
            <p class="text-base-content/60 text-sm mt-2 font-medium">${subtitle}</p>
          </div>
        </div>

        <!-- Form -->
        <form class="space-y-6">
          <!-- Account Name -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-base-content/40 uppercase tracking-widest ml-1">
              Account Name
            </label>
            <input
              type="text"
              placeholder="e.g. Mandiri Savings / AAPL Stock"
              value="${accountName}"
              class="input input-lg w-full bg-base-200 border border-base-300 rounded-2xl font-bold text-base-content focus:ring-2 focus:ring-accent focus:outline-none focus:border-accent placeholder:text-base-content/30 placeholder:font-normal"
            />
          </div>

          <!-- Account Category -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold text-base-content/40 uppercase tracking-widest ml-1">
                Account Category
              </label>
            </div>
            <select class="select select-lg w-full bg-base-200 border border-base-300 rounded-2xl font-bold text-base-content focus:ring-2 focus:ring-accent focus:outline-none focus:border-accent">
              ${Object.entries(accountTypeLabels)
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${value === accountType ? 'selected' : ''}>${label}</option>`
                )
                .join('')}
            </select>
          </div>

          <!-- Currency and Balance -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Currency -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-base-content/40 uppercase tracking-widest ml-1">
                Currency
              </label>
              <select class="select select-lg w-full bg-base-200 border border-base-300 rounded-2xl font-bold text-base-content focus:ring-2 focus:ring-accent focus:outline-none focus:border-accent">
                <option value="IDR" ${currency === 'IDR' ? 'selected' : ''}>IDR</option>
                <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD</option>
              </select>
            </div>

            <!-- Balance -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-base-content/40 uppercase tracking-widest ml-1">
                ${isEditMode ? 'Current Balance' : 'Initial Balance'}
              </label>
              <input
                type="number"
                placeholder="0"
                value="${balance}"
                class="input input-lg w-full bg-base-200 border border-base-300 rounded-2xl font-bold text-base-content focus:ring-2 focus:ring-accent focus:outline-none focus:border-accent placeholder:text-base-content/30 placeholder:font-normal"
              />
            </div>
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
          <div class="flex items-center gap-4 pt-4">
            <button
              type="button"
              class="flex-1 py-4 text-base-content/60 font-bold hover:bg-base-200 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-[2] btn btn-accent py-4 rounded-full font-bold text-base shadow-lg shadow-accent/20 hover:shadow-xl transition-all"
              ${isLoading ? 'disabled' : ''}
            >
              ${isLoading ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  return container;
};

export const AddMode: StoryObj = {
  args: {
    mode: 'add',
    accountName: '',
    accountType: 'bank_account',
    currency: 'IDR',
    balance: '',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAccountFormModal(args),
};

export const EditMode: StoryObj = {
  args: {
    mode: 'edit',
    accountName: 'BCA Savings',
    accountType: 'bank_account',
    currency: 'IDR',
    balance: '15250000',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAccountFormModal(args),
};

export const EditModeUSD: StoryObj = {
  args: {
    mode: 'edit',
    accountName: 'Fidelity 401(k)',
    accountType: 'stock',
    currency: 'USD',
    balance: '125000',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAccountFormModal(args),
};

export const Loading: StoryObj = {
  args: {
    mode: 'add',
    accountName: 'New Account',
    accountType: 'mutual_fund',
    currency: 'IDR',
    balance: '10000000',
    isLoading: true,
    hasError: false,
  },
  render: (args) => createAccountFormModal(args),
};

export const WithError: StoryObj = {
  args: {
    mode: 'add',
    accountName: 'Duplicate Account',
    accountType: 'bank_account',
    currency: 'IDR',
    balance: '5000000',
    isLoading: false,
    hasError: true,
    errorMessage: 'An account with this name already exists.',
  },
  render: (args) => createAccountFormModal(args),
};

export const AllAccountTypes: StoryObj = {
  args: {
    mode: 'add',
    accountName: '',
    accountType: 'stock',
    currency: 'USD',
    balance: '',
    isLoading: false,
    hasError: false,
  },
  render: (args) => createAccountFormModal(args),
};
