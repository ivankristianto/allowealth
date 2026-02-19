import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AccountsWidget',
  tags: ['autodocs'],
  argTypes: {
    accountIdr: { control: 'number', description: 'Total accounts in IDR' },
    accountUsd: { control: 'number', description: 'Total accounts in USD' },
    debtIdr: { control: 'number', description: 'Total debt in IDR' },
    debtUsd: { control: 'number', description: 'Total debt in USD' },
    loading: { control: 'boolean', description: 'Show loading state' },
  },
};

export default meta;

const badge =
  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0';

// Lucide Landmark icon SVG (20px for header)
const landmarkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`;

// Lucide Wallet icon SVG (16px for section header)
const walletIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`;

// Lucide CreditCard icon SVG (16px for section header)
const creditCardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;

const createAccountsWidget = (args: {
  accountIdr?: number;
  accountUsd?: number;
  debtIdr?: number;
  debtUsd?: number;
  loading?: boolean;
}): HTMLElement => {
  const { accountIdr = 0, accountUsd = 0, debtIdr = 0, debtUsd = 0, loading = false } = args;

  const container = document.createElement('div');
  container.className = 'block max-w-sm';

  const hasDebt = debtIdr > 0 || debtUsd > 0;
  const isEmpty = !accountIdr && !accountUsd && !debtIdr && !debtUsd;

  if (loading) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-base-300/50 animate-pulse shrink-0"></div>
          <div class="h-3.5 w-32 bg-base-300/50 rounded animate-pulse"></div>
        </div>
        <div class="mt-6">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-4 rounded-full bg-base-300/50 animate-pulse"></div>
            <div class="h-3 w-24 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="space-y-2">
            <div class="h-5 w-[85%] bg-base-300/50 rounded animate-pulse"></div>
            <div class="h-5 w-[70%] bg-base-300/50 rounded animate-pulse"></div>
          </div>
        </div>
        <div class="border-t border-base-300 pt-5 mt-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-4 rounded-full bg-base-300/50 animate-pulse"></div>
            <div class="h-3 w-20 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="h-5 w-[60%] bg-base-300/50 rounded animate-pulse"></div>
        </div>
      </div>`;
    return container;
  }

  if (isEmpty) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8 text-center">
        <p class="font-semibold text-base-content/60">No accounts yet</p>
        <p class="text-sm text-base-content/40 mt-1">Add your first account to start tracking your finances.</p>
      </div>`;
    return container;
  }

  let accountsHtml = '';
  if (accountIdr > 0) {
    accountsHtml += `<div class="flex items-center gap-2.5">
      <span class="${badge} bg-success/10 text-success">IDR</span>
      <p class="text-lg font-bold text-success tracking-tight leading-none truncate">${formatCurrency(accountIdr, 'IDR')}</p>
    </div>`;
  }
  if (accountUsd > 0) {
    accountsHtml += `<div class="flex items-center gap-2.5">
      <span class="${badge} bg-info/10 text-info">USD</span>
      <p class="text-lg font-bold text-info tracking-tight leading-none truncate">${formatCurrency(accountUsd, 'USD')}</p>
    </div>`;
  }
  if (!accountIdr && !accountUsd) {
    accountsHtml = '<p class="text-sm text-base-content/40">No accounts</p>';
  }

  let debtHtml = '';
  if (hasDebt) {
    let debtRows = '';
    if (debtIdr > 0) {
      debtRows += `<div class="flex items-center gap-2.5">
        <span class="${badge} bg-success/10 text-success">IDR</span>
        <p class="text-lg font-bold text-error tracking-tight leading-none truncate">${formatCurrency(debtIdr, 'IDR')}</p>
      </div>`;
    }
    if (debtUsd > 0) {
      debtRows += `<div class="flex items-center gap-2.5">
        <span class="${badge} bg-info/10 text-info">USD</span>
        <p class="text-lg font-bold text-error tracking-tight leading-none truncate">${formatCurrency(debtUsd, 'USD')}</p>
      </div>`;
    }
    debtHtml = `
      <div class="border-t border-base-300 pt-5 mt-5">
        <div class="flex items-center gap-2 mb-3">
          ${creditCardIcon}
          <span class="label-premium uppercase tracking-widest font-semibold text-xs text-base-content/60">Total Debt</span>
        </div>
        <div class="space-y-2">${debtRows}</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
      <!-- Header with IconBadge -->
      <div class="flex items-center gap-3">
        <div class="rounded-2xl p-3 bg-accent/10 text-accent shadow-sm shrink-0">
          <span class="text-xl block">${landmarkIcon}</span>
        </div>
        <span class="label-premium uppercase tracking-widest font-semibold text-sm text-base-content/60">Accounts Overview</span>
      </div>

      <!-- Total Accounts Section -->
      <div class="mt-6">
        <div class="flex items-center gap-2 mb-3">
          ${walletIcon}
          <span class="label-premium uppercase tracking-widest font-semibold text-xs text-base-content/60">Total Accounts</span>
        </div>
        <div class="space-y-2">${accountsHtml}</div>
      </div>
      ${debtHtml}
    </div>`;

  return container;
};

export const Default: StoryObj = {
  args: {
    accountIdr: 1956063000,
    accountUsd: 130404.2,
    debtIdr: 15000000,
    debtUsd: 2500,
    loading: false,
  },
  render: (args) => createAccountsWidget(args),
};

export const AccountsOnly: StoryObj = {
  args: {
    accountIdr: 1956063000,
    accountUsd: 130404.2,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createAccountsWidget(args),
};

export const WithDebt: StoryObj = {
  args: {
    accountIdr: 500000000,
    accountUsd: 10000,
    debtIdr: 25000000,
    debtUsd: 5000,
    loading: false,
  },
  render: (args) => createAccountsWidget(args),
};

export const IDROnly: StoryObj = {
  args: {
    accountIdr: 150000000,
    accountUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createAccountsWidget(args),
};

export const Loading: StoryObj = {
  args: { loading: true },
  render: (args) => createAccountsWidget(args),
};

export const Empty: StoryObj = {
  args: {
    accountIdr: 0,
    accountUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createAccountsWidget(args),
};
