/**
 * LedgerProjections Component Stories
 *
 * Storybook stories for the LedgerProjections table component showing
 * different states and data scenarios.
 */

import type { Meta, StoryObj } from '@storybook/html';
import type { ForecastDataPoint } from '@/lib/forecast';

// @TODO: Mock data - Consolidate with WealthTrajectory mock generator into shared utility
// Both components use nearly identical mock data generation logic

// Mock forecast data for stories
function generateMockProjectionData(months: number): ForecastDataPoint[] {
  const data: ForecastDataPoint[] = [];
  const startDate = new Date(2026, 0, 1); // Jan 2026
  let balance = 1000000; // Start with 1M IDR

  for (let i = 0; i <= months; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const interest = balance * (0.07 / 12); // 7% annual / 12 months
    balance = balance + interest + 5000000; // Add 5M topup

    data.push({
      key,
      dateLabel,
      forecastBalance: Math.round(balance),
      forecastInterest: Math.round(interest),
      realBalance: i < 3 ? Math.round(balance * 0.95) : null, // Real data for first 3 months
      realInterest: i < 3 ? Math.round(interest * 0.9) : null,
    });
  }

  return data;
}

const mockData = generateMockProjectionData(12); // 12 months for story display

const meta: Meta = {
  title: 'Organisms/LedgerProjections',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj;

/**
 * Default state with projection data
 */
export const Default: Story = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100 overflow-hidden">
        <div class="p-8 border-b border-base-300">
          <h3 class="text-xl font-bold text-base-content tracking-tight leading-none">
            Ledger Projections
          </h3>
          <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">
            120 MONTH DETAILED BREAKDOWN
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead class="bg-base-200/50">
              <tr class="border-b border-base-300">
                <th class="px-8 py-5 text-left">
                  <span class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">PERIOD</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-accent uppercase tracking-widest">FORECAST INTEREST</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-accent uppercase tracking-widest">FORECAST BALANCE</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-success uppercase tracking-widest">REAL INTEREST</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-success uppercase tracking-widest">REAL BALANCE</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-base-300">
              ${mockData
                .map(
                  (row) => `
                <tr class="hover:bg-base-200/50 transition-colors">
                  <td class="px-8 py-4">
                    <span class="text-sm font-bold text-base-content">${row.dateLabel}</span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-medium text-base-content/60">
                      +Rp${(row.forecastInterest / 1000000).toFixed(1)}M
                    </span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-bold text-accent">
                      Rp${(row.forecastBalance / 1000000).toFixed(1)}M
                    </span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-medium text-base-content/40">
                      ${row.realInterest !== null ? `+Rp${(row.realInterest / 1000000).toFixed(1)}M` : '—'}
                    </span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-bold text-success">
                      ${row.realBalance !== null ? `Rp${(row.realBalance / 1000000).toFixed(1)}M` : '—'}
                    </span>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    return container;
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100">
        <div class="p-8 border-b border-base-300">
          <h3 class="text-xl font-bold">Ledger Projections</h3>
          <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">
            LOADING DATA...
          </p>
        </div>

        <div class="p-8 space-y-3">
          ${Array.from({ length: 10 })
            .map(
              () => `
            <div class="flex items-center justify-between p-4 bg-base-200/30 rounded-xl animate-pulse">
              <div class="h-4 bg-base-300 rounded w-24"></div>
              <div class="h-4 bg-base-300 rounded w-32"></div>
              <div class="h-4 bg-base-300 rounded w-32"></div>
              <div class="h-4 bg-base-300 rounded w-20"></div>
              <div class="h-4 bg-base-300 rounded w-20"></div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
    return container;
  },
};

/**
 * Error state
 */
export const Error: Story = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100">
        <div class="p-8 border-b border-base-300">
          <h3 class="text-xl font-bold">Ledger Projections</h3>
          <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">
            120 MONTH DETAILED BREAKDOWN
          </p>
        </div>

        <div class="p-12 text-center">
          <p class="text-error font-medium">Failed to load projection data. Please try again later.</p>
        </div>
      </div>
    `;
    return container;
  },
};

/**
 * Empty state (no data)
 */
export const Empty: Story = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100">
        <div class="p-8 border-b border-base-300">
          <h3 class="text-xl font-bold">Ledger Projections</h3>
          <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">
            120 MONTH DETAILED BREAKDOWN
          </p>
        </div>

        <div class="p-12 text-center">
          <p class="text-base-content/60 font-medium">No projection data available.</p>
        </div>
      </div>
    `;
    return container;
  },
};

/**
 * With only forecast data (no real history)
 */
export const ForecastOnly: Story = {
  render: () => {
    const forecastOnlyData = generateMockProjectionData(12).map((d) => ({
      ...d,
      realBalance: null,
      realInterest: null,
    }));

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100 overflow-hidden">
        <div class="p-8 border-b border-base-300">
          <h3 class="text-xl font-bold">Ledger Projections</h3>
          <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">
            FORECAST ONLY (NO HISTORICAL DATA)
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead class="bg-base-200/50">
              <tr class="border-b border-base-300">
                <th class="px-8 py-5 text-left">
                  <span class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">PERIOD</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-accent uppercase tracking-widest">FORECAST INTEREST</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-accent uppercase tracking-widest">FORECAST BALANCE</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-success uppercase tracking-widest">REAL INTEREST</span>
                </th>
                <th class="px-8 py-5 text-right">
                  <span class="text-[10px] font-bold text-success uppercase tracking-widest">REAL BALANCE</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-base-300">
              ${forecastOnlyData
                .map(
                  (row) => `
                <tr class="hover:bg-base-200/50 transition-colors">
                  <td class="px-8 py-4">
                    <span class="text-sm font-bold text-base-content">${row.dateLabel}</span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-medium text-base-content/60">
                      +Rp${(row.forecastInterest / 1000000).toFixed(1)}M
                    </span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-bold text-accent">
                      Rp${(row.forecastBalance / 1000000).toFixed(1)}M
                    </span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-medium text-base-content/40">—</span>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <span class="text-sm font-bold text-success">—</span>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    return container;
  },
};
