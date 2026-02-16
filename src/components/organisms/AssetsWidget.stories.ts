import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AssetsWidget',
  tags: ['autodocs'],
  argTypes: {
    assetIdr: { control: 'number', description: 'Total assets in IDR' },
    assetUsd: { control: 'number', description: 'Total assets in USD' },
    debtIdr: { control: 'number', description: 'Total debt in IDR' },
    debtUsd: { control: 'number', description: 'Total debt in USD' },
    loading: { control: 'boolean', description: 'Show loading state' },
  },
};

export default meta;

const badge =
  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0';

const createAssetsWidget = (args: {
  assetIdr?: number;
  assetUsd?: number;
  debtIdr?: number;
  debtUsd?: number;
  loading?: boolean;
}): HTMLElement => {
  const { assetIdr = 0, assetUsd = 0, debtIdr = 0, debtUsd = 0, loading = false } = args;

  const container = document.createElement('div');
  container.className = 'block max-w-sm';

  const hasDebt = debtIdr > 0 || debtUsd > 0;
  const isEmpty = !assetIdr && !assetUsd && !debtIdr && !debtUsd;

  if (loading) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-4 rounded-full bg-base-300/50 animate-pulse"></div>
            <div class="h-3 w-24 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="space-y-2">
            <div class="h-5 w-3/4 bg-base-300/50 rounded animate-pulse"></div>
            <div class="h-5 w-2/3 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="h-px bg-base-200"></div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-4 rounded-full bg-base-300/50 animate-pulse"></div>
            <div class="h-3 w-20 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="h-5 w-1/2 bg-base-300/50 rounded animate-pulse"></div>
        </div>
      </div>`;
    return container;
  }

  if (isEmpty) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8 text-center">
        <p class="font-semibold text-base-content/60">No assets yet</p>
        <p class="text-sm text-base-content/40 mt-1">Add your first asset to start tracking your finances.</p>
      </div>`;
    return container;
  }

  let assetsHtml = '';
  if (assetIdr > 0) {
    assetsHtml += `<div class="flex items-center gap-2">
      <span class="${badge} bg-success/10 text-success">IDR</span>
      <p class="text-lg font-bold text-success tracking-tight leading-none truncate">${formatCurrency(assetIdr, 'IDR')}</p>
    </div>`;
  }
  if (assetUsd > 0) {
    assetsHtml += `<div class="flex items-center gap-2">
      <span class="${badge} bg-info/10 text-info">USD</span>
      <p class="text-lg font-bold text-info tracking-tight leading-none truncate">${formatCurrency(assetUsd, 'USD')}</p>
    </div>`;
  }
  if (!assetIdr && !assetUsd) {
    assetsHtml = '<p class="text-sm text-base-content/40">No assets</p>';
  }

  let debtHtml = '';
  if (hasDebt) {
    let debtRows = '';
    if (debtIdr > 0) {
      debtRows += `<div class="flex items-center gap-2">
        <span class="${badge} bg-success/10 text-success">IDR</span>
        <p class="text-lg font-bold text-error tracking-tight leading-none truncate">${formatCurrency(debtIdr, 'IDR')}</p>
      </div>`;
    }
    if (debtUsd > 0) {
      debtRows += `<div class="flex items-center gap-2">
        <span class="${badge} bg-info/10 text-info">USD</span>
        <p class="text-lg font-bold text-error tracking-tight leading-none truncate">${formatCurrency(debtUsd, 'USD')}</p>
      </div>`;
    }
    debtHtml = `
      <div class="border-t border-base-200" aria-hidden="true"></div>
      <div>
        <div class="flex items-center gap-2 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Total Debt</span>
        </div>
        <div class="space-y-1.5">${debtRows}</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
      <div class="space-y-5">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
            <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Total Assets</span>
          </div>
          <div class="space-y-1.5">${assetsHtml}</div>
        </div>
        ${debtHtml}
      </div>
    </div>`;

  return container;
};

export const Default: StoryObj = {
  args: {
    assetIdr: 1956063000,
    assetUsd: 130404.2,
    debtIdr: 15000000,
    debtUsd: 2500,
    loading: false,
  },
  render: (args) => createAssetsWidget(args),
};

export const AssetsOnly: StoryObj = {
  args: {
    assetIdr: 1956063000,
    assetUsd: 130404.2,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createAssetsWidget(args),
};

export const WithDebt: StoryObj = {
  args: {
    assetIdr: 500000000,
    assetUsd: 10000,
    debtIdr: 25000000,
    debtUsd: 5000,
    loading: false,
  },
  render: (args) => createAssetsWidget(args),
};

export const IDROnly: StoryObj = {
  args: {
    assetIdr: 150000000,
    assetUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createAssetsWidget(args),
};

export const Loading: StoryObj = {
  args: { loading: true },
  render: (args) => createAssetsWidget(args),
};

export const Empty: StoryObj = {
  args: {
    assetIdr: 0,
    assetUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createAssetsWidget(args),
};
