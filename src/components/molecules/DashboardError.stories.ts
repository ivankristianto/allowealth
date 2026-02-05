import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { TriangleAlert, RefreshCw, Info } = IconRenderers;

const meta: Meta = {
  title: 'Molecules/DashboardError',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment
| Property | Value | Class |
|----------|-------|-------|
| Error Icon | TriangleAlert | size={32}, text-error |
| Retry Button Icon | RefreshCw | size={16}, stroke-current |
| Support Button Icon | Info | size={16}, stroke-current |

### Layout
- Card component wrapper with custom className
- Centered content: flex flex-col items-center text-center
- Vertical padding: py-8
- Icon at top, then heading, message, actions, suggestion

### Content Structure
| Element | Styling |
|---------|---------|
| Error Icon | mb-4, size={32} |
| Heading | text-xl font-bold text-error mb-2 |
| Message | text-base-content/60 mb-4 max-w-md |
| Details | Expandable details/summary element |
| Actions | flex gap-3 flex-wrap justify-center |
| Suggestion | text-sm text-base-content/60 mt-4 |

### Technical Details Section
- Uses native details/summary elements
- Summary: cursor-pointer, hover:text-base-content
- Pre/code block: bg-base-200 rounded text-xs overflow-auto max-w-md

### Action Buttons
| Button | Icon | Class |
|--------|------|-------|
| Try Again | RefreshCw | btn btn-accent flex items-center gap-2 |
| Get Help | Info | Button variant="outline" |

### Props
| Prop | Type | Default |
|------|------|---------|
| message | string | "Unable to load dashboard data" |
| details | string | undefined (optional) |
| showRetry | boolean | true |
| supportUrl | string | undefined (optional) |
| className | string | "" |

### Accessibility
- Card has aria-live="assertive" for immediate announcement
- Card has data-dashboard-error attribute for testing
- All icons have aria-hidden="true"
- Retry button uses semantic button element
- Support button uses Button component with href
- Proper heading hierarchy (h3)

### Client-Side Behavior
- Retry button has data-action="reload-page"
- Click handler calls window.location.reload()
- Initializes on DOMContentLoaded
- Re-initializes on astro:page-load

### Responsive Design
- Actions wrap on small screens (flex-wrap)
- Message constrained to max-w-md
- Details pre constrained to max-w-md with overflow-auto
        `,
      },
    },
  },
  argTypes: {
    message: {
      control: 'text',
      description: 'Error message to display',
    },
    details: {
      control: 'text',
      description: 'Technical error details (optional)',
    },
    showRetry: {
      control: 'boolean',
      description: 'Show retry button',
    },
    supportUrl: {
      control: 'text',
      description: 'URL to support page (optional)',
    },
  },
};

export default meta;

const createDashboardError = (args: {
  message?: string;
  details?: string;
  showRetry?: boolean;
  supportUrl?: string;
}): HTMLElement => {
  const { message = 'Unable to load dashboard data', details, showRetry = true, supportUrl } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100 min-h-[400px]';

  const card = document.createElement('div');
  card.className = 'card border border-base-300';
  card.setAttribute('data-dashboard-error', '');
  card.setAttribute('aria-live', 'assertive');

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  const content = document.createElement('div');
  content.className = 'flex flex-col items-center text-center py-8';

  // Error Icon
  const iconContainer = document.createElement('div');
  iconContainer.className = 'mb-4';
  iconContainer.appendChild(
    TriangleAlert.render({ size: 32, class: 'text-error' }, { 'aria-hidden': 'true' })
  );
  content.appendChild(iconContainer);

  // Error Heading
  const heading = document.createElement('h3');
  heading.className = 'text-xl font-bold text-error mb-2';
  heading.textContent = 'Something went wrong';
  content.appendChild(heading);

  // Error Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-base-content/60 mb-4 max-w-md';
  messageEl.textContent = message;
  content.appendChild(messageEl);

  // Technical Details
  if (details) {
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'mb-4';
    detailsContainer.innerHTML = `
      <details class="text-left">
        <summary class="cursor-pointer text-sm text-base-content/60 hover:text-base-content">
          Technical details
        </summary>
        <pre class="mt-2 p-3 bg-base-200 rounded text-xs overflow-auto max-w-md"><code>${details}</code></pre>
      </details>
    `;
    content.appendChild(detailsContainer);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'flex gap-3 flex-wrap justify-center';

  if (showRetry) {
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'btn btn-accent flex items-center gap-2';
    retryButton.setAttribute('data-action', 'reload-page');
    retryButton.appendChild(
      RefreshCw.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })
    );
    retryButton.appendChild(document.createTextNode('Try Again'));
    retryButton.addEventListener('click', () => {
      // In Storybook, log action instead of reloading
      // eslint-disable-next-line no-console
      console.log('[Storybook] Retry button clicked - would trigger page reload');
    });
    actions.appendChild(retryButton);
  }

  if (supportUrl) {
    const supportButton = document.createElement('a');
    supportButton.href = supportUrl;
    supportButton.className = 'btn btn-outline flex items-center gap-2';
    supportButton.appendChild(
      Info.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })
    );
    supportButton.appendChild(document.createTextNode('Get Help'));
    actions.appendChild(supportButton);
  }

  content.appendChild(actions);

  // Suggestion
  const suggestion = document.createElement('p');
  suggestion.className = 'text-sm text-base-content/60 mt-4';
  suggestion.textContent =
    'If this problem persists, please check your internet connection or contact support.';
  content.appendChild(suggestion);

  cardBody.appendChild(content);
  card.appendChild(cardBody);
  container.appendChild(card);

  return container;
};

// Default state
export const Default: StoryObj = {
  args: {
    message: 'Unable to load dashboard data',
    showRetry: true,
  },
  render: (args) => createDashboardError(args),
};

// With technical details
export const WithDetails: StoryObj = {
  args: {
    message: 'Failed to fetch financial summary',
    details: 'Error: Network request failed\nStatus: 500\nEndpoint: /api/dashboard/summary',
    showRetry: true,
  },
  render: (args) => createDashboardError(args),
};

// With support link
export const WithSupport: StoryObj = {
  args: {
    message: 'Unable to load dashboard data',
    showRetry: true,
    supportUrl: '/support',
  },
  render: (args) => createDashboardError(args),
};

// Without retry button
export const WithoutRetry: StoryObj = {
  args: {
    message: 'Your session has expired',
    showRetry: false,
    supportUrl: '/login',
  },
  render: (args) => createDashboardError(args),
};

// Full featured
export const FullFeatured: StoryObj = {
  args: {
    message: 'Unable to load your financial data',
    details:
      'Error: ECONNREFUSED\nHost: api.finance.local\nPort: 3001\nTimestamp: 2025-01-28T10:30:00Z',
    showRetry: true,
    supportUrl: '/support',
  },
  render: (args) => createDashboardError(args),
};

// All states
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const states = [
      { title: 'Default', args: { message: 'Unable to load dashboard data', showRetry: true } },
      {
        title: 'With Technical Details',
        args: {
          message: 'Failed to fetch data',
          details: 'Error: Network timeout\nStatus: 504',
          showRetry: true,
        },
      },
      {
        title: 'With Support Link',
        args: { message: 'Unable to load data', showRetry: true, supportUrl: '/support' },
      },
      {
        title: 'Without Retry',
        args: { message: 'Session expired', showRetry: false, supportUrl: '/login' },
      },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(createDashboardError(state.args));
      container.appendChild(section);
    });

    return container;
  },
};
