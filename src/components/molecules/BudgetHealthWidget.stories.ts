import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Check, TriangleAlert, ArrowRight } = IconRenderers;
import {
  mockBudgetHealthData,
  mockBudgetHealthHealthy,
  mockBudgetHealthExceeded,
} from '@/services/__tests__/mocks/dashboard-mocks';
import {
  formatCurrency,
  formatPercentage,
  getStatusColor,
  getStatusBg,
  getStatusBadge,
  getProgressBarColor,
  getAlertItemStatusBadge,
} from './__tests__/budget-health-test-utils';

const meta: Meta = {
  title: 'Molecules/BudgetHealthWidget',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Status Icon Size | 22px | \`size={22}\` (md) |
| Large Icon Size | 24px | \`size={24}\` (lg) |
| Arrow Icon Size | 16px | \`size={16}\` (xs) |
| Icon Class | stroke-current | Inherits status color |
| Container | Rounded card | \`p-4 rounded-lg border\` |

### Icon Mapping

| Context | Icon | Usage |
|---------|------|-------|
| Healthy Status | Check | Header icon, no alerts state |
| Warning/Exceeded | TriangleAlert | Budget alerts |
| View Budget Link | ArrowRight | Action link with hover animation |

### Status Colors

| Status | Text Color | Background | Border |
|--------|-----------|------------|--------|
| healthy | text-success | bg-success/10 | border-success/20 |
| warning | text-warning | bg-warning/10 | border-warning/20 |
| exceeded | text-error | bg-error/10 | border-error/20 |

### Badge Labels

| Status | Label |
|--------|-------|
| healthy | All Good |
| warning | Review |
| exceeded | Action Needed |

### Accessibility
- \`aria-hidden="true"\` on all decorative icons
- \`aria-label="View detailed budget breakdown"\` on action link
- \`role="progressbar"\` with aria-valuenow/min/max on progress bars
- \`data-budget-health-widget\` attribute for testing

### Props
- **data**: Budget health data object (alertCount, status, alerts)
- **viewBudgetUrl**: Custom URL for action link (default: /budget)
- **className**: Additional CSS classes
        `,
      },
    },
  },
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

  const iconWrapper = document.createElement('div');
  iconWrapper.className = `flex items-center gap-3`;
  iconWrapper.innerHTML = `
    <div class="p-2 rounded-full" style="background-color: ${budgetData.status === 'healthy' ? 'rgba(16, 185, 129, 0.1)' : budgetData.status === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}">
      <div data-icon-wrapper></div>
    </div>
    <div>
      <div class="text-2xl font-bold ${getStatusColor(budgetData.status)}">${budgetData.alertCount}</div>
      <div class="text-sm text-neutral">alert${budgetData.alertCount !== 1 ? 's' : ''}</div>
    </div>
  `;

  // Render the appropriate icon using Lucide's render method
  const iconContainer = iconWrapper.querySelector('[data-icon-wrapper]') as HTMLElement;
  if (budgetData.status === 'healthy') {
    iconContainer.appendChild(
      Check.render(
        { size: 22, class: `stroke-current ${getStatusColor(budgetData.status)}` },
        { 'aria-hidden': 'true' }
      )
    );
  } else {
    iconContainer.appendChild(
      TriangleAlert.render(
        { size: 22, class: `stroke-current ${getStatusColor(budgetData.status)}` },
        { 'aria-hidden': 'true' }
      )
    );
  }

  header.appendChild(iconWrapper);

  const badge = document.createElement('div');
  badge.className = `badge ${getStatusBadge(budgetData.status)} badge-lg`;
  badge.textContent =
    budgetData.status === 'healthy'
      ? 'All Good'
      : budgetData.status === 'warning'
        ? 'Review'
        : 'Action Needed';
  header.appendChild(badge);
  widget.appendChild(header);

  // Alert details
  if (budgetData.alerts.length > 0) {
    const alertsContainer = document.createElement('div');
    alertsContainer.className = 'mb-4';

    const alertsTitle = document.createElement('h4');
    alertsTitle.className = 'text-sm font-medium text-neutral mb-2';
    alertsTitle.textContent = 'Categories needing attention:';
    alertsContainer.appendChild(alertsTitle);

    const alertsList = document.createElement('ul');
    alertsList.className = 'space-y-3';
    alertsList.setAttribute('role', 'list');

    budgetData.alerts.forEach((alert) => {
      const alertItem = document.createElement('li');
      alertItem.className =
        'p-3 bg-base-100/80 rounded-lg border border-base-300 hover:border-current/30 transition-colors';

      const alertHeader = document.createElement('div');
      alertHeader.className = 'flex items-center justify-between mb-2';
      alertHeader.innerHTML = `
        <span class="font-medium">${alert.categoryName}</span>
        <span class="badge ${getAlertItemStatusBadge(alert.status)} badge-sm">
          ${formatPercentage(alert.percentage)}
        </span>
      `;

      const alertDetails = document.createElement('div');
      alertDetails.className = 'flex items-center justify-between text-sm mb-2';
      alertDetails.innerHTML = `
        <span class="text-neutral">${formatCurrency(alert.spentAmount)} of ${formatCurrency(alert.budgetAmount)}</span>
        <span class="font-medium ${alert.remaining < 0 ? 'text-error' : 'text-success'}">
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
      alertsList.appendChild(alertItem);
    });

    alertsContainer.appendChild(alertsList);
    widget.appendChild(alertsContainer);
  } else {
    // No alerts state
    const noAlerts = document.createElement('div');
    noAlerts.className = 'mb-4 p-4 bg-base-100/80 rounded-lg text-center';

    // Render Check icon using Lucide's render method
    const checkIcon = Check.render(
      { size: 24, class: 'stroke-current text-success mx-auto mb-2' },
      {
        'aria-hidden': 'true',
      }
    );
    noAlerts.appendChild(checkIcon);

    const message = document.createElement('p');
    message.className = 'text-sm font-medium text-success';
    message.textContent = 'All budgets healthy!';
    noAlerts.appendChild(message);

    const subMessage = document.createElement('p');
    subMessage.className = 'text-xs text-neutral mt-1';
    subMessage.textContent = "You're on track with all your spending categories.";
    noAlerts.appendChild(subMessage);

    widget.appendChild(noAlerts);
  }

  // View Budget link
  const viewBudgetLink = document.createElement('a');
  viewBudgetLink.href = viewBudgetUrl;
  viewBudgetLink.className =
    'flex items-center justify-center gap-2 w-full py-2 px-4 bg-base-100 hover:bg-base-200 rounded-lg transition-colors text-sm font-medium group';
  viewBudgetLink.setAttribute('aria-label', 'View detailed budget breakdown');

  const linkText = document.createElement('span');
  linkText.textContent = 'View Budget';
  viewBudgetLink.appendChild(linkText);

  const arrowIcon = ArrowRight.render(
    { size: 16, class: 'group-hover:translate-x-1 transition-transform stroke-current' },
    { 'aria-hidden': 'true' }
  );
  viewBudgetLink.appendChild(arrowIcon);
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
