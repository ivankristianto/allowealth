import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Molecules/BudgetAlertBanner',
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Alert title',
    },
    message: {
      control: 'text',
      description: 'Alert message content',
    },
    variant: {
      control: 'select',
      options: ['warning', 'error', 'info'],
      description: 'Alert variant',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
  },
};

export default meta;

type Story = StoryObj;

export const Warning: Story = {
  args: {
    title: 'Budget alert',
    message: "You've reached 95% of your dining budget. Consider eating at home this week.",
    variant: 'warning',
    dismissible: false,
  },
  render: (args) => html`
    <budget-alert-banner
      title="${args.title}"
      message="${args.message}"
      variant="${args.variant}"
      ?dismissible="${args.dismissible}"
    ></budget-alert-banner>
  `,
};

export const Error: Story = {
  args: {
    title: 'Over budget',
    message:
      "You've exceeded your monthly budget by Rp2.500.000. Consider reducing discretionary spending.",
    variant: 'error',
    dismissible: false,
  },
  render: (args) => html`
    <budget-alert-banner
      title="${args.title}"
      message="${args.message}"
      variant="${args.variant}"
      ?dismissible="${args.dismissible}"
    ></budget-alert-banner>
  `,
};

export const Info: Story = {
  args: {
    title: 'Budget tip',
    message:
      'Your transportation spending is 20% lower than last month. Great job keeping up with your savings goals!',
    variant: 'info',
    dismissible: false,
  },
  render: (args) => html`
    <budget-alert-banner
      title="${args.title}"
      message="${args.message}"
      variant="${args.variant}"
      ?dismissible="${args.dismissible}"
    ></budget-alert-banner>
  `,
};

export const Dismissible: Story = {
  args: {
    title: 'Budget alert',
    message: "You've reached 95% of your dining budget. Consider eating at home this week.",
    variant: 'warning',
    dismissible: true,
  },
  render: (args) => html`
    <budget-alert-banner
      title="${args.title}"
      message="${args.message}"
      variant="${args.variant}"
      ?dismissible="${args.dismissible}"
    ></budget-alert-banner>
  `,
};

export const AllVariants: Story = {
  args: {
    title: 'Budget alert',
    message: "You've reached 95% of your dining budget. Consider eating at home this week.",
    variant: 'warning',
    dismissible: false,
  },
  render: () => html`
    <div class="space-y-4 p-4 max-w-lg">
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Warning</span>
        <budget-alert-banner
          title="Budget alert"
          message="You've reached 95% of your dining budget. Consider eating at home this week."
          variant="warning"
        ></budget-alert-banner>
      </div>
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Error</span>
        <budget-alert-banner
          title="Over budget"
          message="You've exceeded your monthly budget by Rp2.500.000."
          variant="error"
        ></budget-alert-banner>
      </div>
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Info</span>
        <budget-alert-banner
          title="Budget tip"
          message="Your transportation spending is 20% lower than last month."
          variant="info"
        ></budget-alert-banner>
      </div>
    </div>
  `,
};

// Register custom element for Storybook
customElements.define(
  'budget-alert-banner',
  class extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') ?? 'Budget alert';
      const message = this.getAttribute('message') ?? '';
      const variant = this.getAttribute('variant') ?? 'warning';
      const dismissible = this.hasAttribute('dismissible');

      const variantClasses: Record<
        string,
        { bg: string; border: string; icon: string; title: string; message: string }
      > = {
        warning: {
          bg: 'bg-warning/5 dark:bg-warning/10',
          border: 'border-warning/20 dark:border-warning/30',
          icon: 'text-warning',
          title: 'text-warning dark:text-warning',
          message: 'text-warning/90 dark:text-warning/80',
        },
        error: {
          bg: 'bg-error/5 dark:bg-error/10',
          border: 'border-error/20 dark:border-error/30',
          icon: 'text-error',
          title: 'text-error dark:text-error',
          message: 'text-error/90 dark:text-error/80',
        },
        info: {
          bg: 'bg-info/5 dark:bg-info/10',
          border: 'border-info/20 dark:border-info/30',
          icon: 'text-info',
          title: 'text-info dark:text-info',
          message: 'text-info/90 dark:text-info/80',
        },
      };

      const style = variantClasses[variant];
      const icons = {
        warning:
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        error:
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
      };

      this.innerHTML = `
        <div class="p-6 rounded-3xl border ${style.bg} ${style.border}" role="alert" aria-live="polite">
          <div class="flex items-start gap-3">
            <div class="${style.icon} shrink-0 mt-0.5">
              ${icons[variant]}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold tracking-wide ${style.title} leading-none mb-1.5">${title}</p>
              <p class="text-base font-medium leading-relaxed ${style.message}">${message}</p>
            </div>
            ${
              dismissible
                ? `
              <button class="text-base-content/50 hover:text-base-content transition-colors p-1 -mr-1 -mt-1" aria-label="Dismiss alert" data-dismiss="alert">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            `
                : ''
            }
          </div>
        </div>
      `;

      // Add dismiss functionality
      if (dismissible) {
        const dismissBtn = this.querySelector('[data-dismiss="alert"]');
        dismissBtn?.addEventListener('click', () => {
          this.remove();
        });
      }
    }
  }
);
