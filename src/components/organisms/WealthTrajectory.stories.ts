/**
 * WealthTrajectory Component Stories
 *
 * Storybook stories for the WealthTrajectory component showing
 * different states and data scenarios.
 */

import type { Meta, StoryObj } from '@storybook/html';
import type { ForecastDataPoint } from '@/lib/forecast';

// @TODO: Mock data - Extract mock data generators to shared test utilities
// Location: src/lib/forecast/__mocks__/generators.ts or src/services/__tests__/mocks/forecast-mocks.ts
// This would allow reusing mock data across stories, tests, and development mode

// Mock forecast data for stories
function generateMockForecastData(months: number): ForecastDataPoint[] {
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
      realBalance: i < 6 ? Math.round(balance * 0.95) : null, // Real data for first 6 months
      realInterest: i < 6 ? Math.round(interest * 0.9) : null,
    });
  }

  return data;
}

const mockData = generateMockForecastData(120);

const meta: Meta = {
  title: 'Organisms/WealthTrajectory',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj;

/**
 * Default state with full forecast data
 */
export const Default: Story = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div
        data-component="WealthTrajectory"
        data-data='${JSON.stringify(mockData)}'
        data-summary='${JSON.stringify({
          year10Target: mockData[mockData.length - 1].forecastBalance,
          totalInterest: mockData.reduce((sum, d) => sum + d.forecastInterest, 0),
          growthMultiple: 2.86,
          currentTotal: 1000000,
        })}'
        data-input='${JSON.stringify({
          monthlyTopup: 5000000,
          annualRate: 7,
          years: 10,
        })}'
      >
        <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100 p-8">
          <div class="space-y-8">
            <div class="flex flex-col lg:flex-row justify-between items-start gap-6">
              <div>
                <h2 class="text-2xl font-bold text-base-content leading-none tracking-tight">
                  Wealth Trajectory
                </h2>
                <p class="text-sm text-base-content/60 mt-2 font-medium">
                  Predicting global asset growth over the next decade.
                </p>
              </div>
              <div class="flex flex-wrap gap-6 items-end">
                <div class="flex-1 min-w-[140px] space-y-2">
                  <label class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
                    MONTHLY TOP-UP (IDR)
                  </label>
                  <input
                    type="number"
                    class="input input-bordered w-full bg-base-200 font-bold"
                    value="5000000"
                  />
                </div>
                <div class="flex-1 min-w-[120px] space-y-2">
                  <label class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
                    EXPECTED APY (%)
                  </label>
                  <input
                    type="number"
                    class="input input-bordered w-full bg-base-200 font-bold"
                    value="7"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <div class="h-[400px] bg-base-200/20 rounded-3xl border border-base-300/50 flex items-center justify-center">
              <p class="text-base-content/40">Chart placeholder (Chart.js renders in actual component)</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="p-6 bg-base-200/40 rounded-3xl border border-base-300/50">
                <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mb-2">
                  YEAR 10 TARGET
                </p>
                <h3 class="text-2xl font-bold text-base-content">Rp2.98B</h3>
              </div>
              <div class="p-6 bg-base-200/40 rounded-3xl border border-base-300/50">
                <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mb-2">
                  TOTAL INTEREST EARNED
                </p>
                <h3 class="text-2xl font-bold text-accent">Rp1.34B</h3>
              </div>
              <div class="p-6 bg-base-200/40 rounded-3xl border border-base-300/50">
                <p class="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mb-2">
                  GROWTH MULTIPLE
                </p>
                <h3 class="text-2xl font-bold text-success">2.86x</h3>
              </div>
            </div>
          </div>
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
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100 p-8">
        <div class="space-y-8">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-2xl font-bold">Wealth Trajectory</h2>
              <p class="text-sm text-base-content/60 mt-2">Loading forecast data...</p>
            </div>
          </div>

          <div class="h-[400px] bg-base-200/30 rounded-3xl animate-pulse"></div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${Array.from({ length: 3 })
              .map(
                () => `
              <div class="p-6 bg-base-200/30 rounded-3xl animate-pulse">
                <div class="h-3 bg-base-300 rounded w-1/2 mb-3"></div>
                <div class="h-8 bg-base-300 rounded w-3/4"></div>
              </div>
            `
              )
              .join('')}
          </div>
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
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100 p-8">
        <div class="space-y-8">
          <div>
            <h2 class="text-2xl font-bold">Wealth Trajectory</h2>
            <p class="text-sm text-base-content/60 mt-2">Predicting global asset growth over the next decade.</p>
          </div>

          <div class="p-12 text-center">
            <p class="text-error font-medium">Failed to load forecast data. Please try again later.</p>
          </div>
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
      <div class="rounded-3xl border border-base-300 shadow-sm bg-base-100 p-8">
        <div class="space-y-8">
          <div>
            <h2 class="text-2xl font-bold">Wealth Trajectory</h2>
            <p class="text-sm text-base-content/60 mt-2">Predicting global asset growth over the next decade.</p>
          </div>

          <div class="p-12 text-center">
            <p class="text-base-content/60 font-medium">No forecast data available.</p>
          </div>
        </div>
      </div>
    `;
    return container;
  },
};
