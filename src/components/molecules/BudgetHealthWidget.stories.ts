import type { Meta, StoryObj } from '@storybook/html';
import {
  mockBudgetHealthData,
  mockBudgetHealthHealthy,
  mockBudgetHealthExceeded,
} from '@/services/__tests__/mocks/dashboard-mocks';

const meta: Meta = {
  title: 'Molecules/BudgetHealthWidget',
  tags: ['autodocs'],
  argTypes: {
    data: {
      control: 'object',
      description: 'Budget health data object',
    },
    viewBudgetUrl: {
      control: 'text',
      description: 'URL for View Budget link',
    },
  },
};

export default meta;

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'text-emerald-600';
    case 'warning':
      return 'text-amber-600';
    case 'exceeded':
      return 'text-red-600';
    default:
      return 'text-neutral-600';
  }
};

const getStatusBg = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-50 border-emerald-200';
    case 'warning':
      return 'bg-amber-50 border-amber-200';
    case 'exceeded':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-base-200 border-base-300';
  }
};

const getStatusBadge = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'badge-success';
    case 'warning':
      return 'badge-warning';
    case 'exceeded':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
};

const getProgressBarColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const createBudgetHealthWidget = (args: { data: object; viewBudgetUrl?: string }): HTMLElement => {
  const { data, viewBudgetUrl = '/budget' } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100';

  const widget = document.createElement('div');
  widget.className = `p-4 rounded-lg border ${getStatusBg((data as any).status)}`;

  const budgetData = data as typeof mockBudgetHealthData;

  // Header with alert count and status
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-full ${getStatusBg(budgetData.status).replace('border', '')}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${getStatusColor(budgetData.status)}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          ${
            budgetData.status === 'healthy'
              ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
              : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />'
          }
        </svg>
      </div>
      <div>
        <div class="text-2xl font-bold ${getStatusColor(budgetData.status)}">${budgetData.alertCount}</div>
        <div class="text-sm text-neutral-600">alert${budgetData.alertCount !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div class="badge ${getStatusBadge(budgetData.status)} badge-lg">
      ${budgetData.status === 'healthy' ? 'All Good' : budgetData.status === 'warning' ? 'Review' : 'Action Needed'}
    </div>
  `;
  widget.appendChild(header);

  // Alert details
  if (budgetData.alerts.length > 0) {
    const alertsContainer = document.createElement('div');
    alertsContainer.className = 'mb-4 space-y-3';

    const alertsTitle = document.createElement('h4');
    alertsTitle.className = 'text-sm font-medium text-neutral-600 mb-2';
    alertsTitle.textContent = 'Categories needing attention:';
    alertsContainer.appendChild(alertsTitle);

    budgetData.alerts.forEach((alert) => {
      const alertItem = document.createElement('div');
      alertItem.className =
        'p-3 bg-base-100/80 rounded-lg border border-base-300 hover:border-current/30 transition-colors';

      const alertHeader = document.createElement('div');
      alertHeader.className = 'flex items-center justify-between mb-2';
      alertHeader.innerHTML = `
        <span class="font-medium">${alert.categoryName}</span>
        <span class="badge ${alert.status === 'exceeded' ? 'badge-error' : alert.status === 'warning' ? 'badge-warning' : 'badge-success'} badge-sm">
          ${formatPercentage(alert.percentage)}
        </span>
      `;

      const alertDetails = document.createElement('div');
      alertDetails.className = 'flex items-center justify-between text-sm mb-2';
      alertDetails.innerHTML = `
        <span class="text-neutral-600">${formatCurrency(alert.spentAmount)} of ${formatCurrency(alert.budgetAmount)}</span>
        <span class="font-medium ${alert.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}">
          ${alert.remaining < 0 ? '-' : '+'}${formatCurrency(Math.abs(alert.remaining))}
        </span>
      `;

      const progressBar = document.createElement('div');
      progressBar.className = 'w-full bg-base-300 rounded-full h-2 overflow-hidden';
      progressBar.innerHTML = `
        <div class="h-full ${getProgressBarColor(alert.percentage)} transition-all duration-300"
             style="width: ${Math.min(alert.percentage, 100)}%"
             role="progressbar"
             aria-valuenow="${alert.percentage}"
             aria-valuemin="0"
             aria-valuemax="100"
             aria-label="${alert.categoryName}: ${formatPercentage(alert.percentage)} used">
        </div>
      `;

      alertItem.appendChild(alertHeader);
      alertItem.appendChild(alertDetails);
      alertItem.appendChild(progressBar);
      alertsContainer.appendChild(alertItem);
    });

    widget.appendChild(alertsContainer);
  } else {
    // No alerts state
    const noAlerts = document.createElement('div');
    noAlerts.className = 'mb-4 p-4 bg-base-100/80 rounded-lg text-center';
    noAlerts.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <p class="text-sm font-medium text-emerald-600">All budgets healthy!</p>
      <p class="text-xs text-neutral-500 mt-1">You're on track with all your spending categories.</p>
    `;
    widget.appendChild(noAlerts);
  }

  // View Budget link
  const viewBudgetLink = document.createElement('a');
  viewBudgetLink.href = viewBudgetUrl;
  viewBudgetLink.className =
    'flex items-center justify-center gap-2 w-full py-2 px-4 bg-base-100 hover:bg-base-200 rounded-lg transition-colors text-sm font-medium group';
  viewBudgetLink.setAttribute('aria-label', 'View detailed budget breakdown');
  viewBudgetLink.innerHTML = `
    View Budget
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  `;
  widget.appendChild(viewBudgetLink);

  container.appendChild(widget);
  return container;
};

// Default state with warnings
export const Default: StoryObj = {
  args: {
    data: mockBudgetHealthData,
  },
  render: (args) => createBudgetHealthWidget({ data: args.data as object }),
};

// Healthy state - no alerts
export const Healthy: StoryObj = {
  args: {
    data: mockBudgetHealthHealthy,
  },
  render: (args) => createBudgetHealthWidget({ data: args.data as object }),
};

// Exceeded state - multiple alerts
export const Exceeded: StoryObj = {
  args: {
    data: mockBudgetHealthExceeded,
  },
  render: (args) => createBudgetHealthWidget({ data: args.data as object }),
};

// All states together
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-3 gap-8';

    const states = [
      { title: 'Healthy', data: mockBudgetHealthHealthy },
      { title: 'Warning', data: mockBudgetHealthData },
      { title: 'Exceeded', data: mockBudgetHealthExceeded },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(createBudgetHealthWidget({ data: state.data }));
      container.appendChild(section);
    });

    return container;
  },
};
