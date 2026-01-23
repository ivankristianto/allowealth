import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Atoms/ProgressBar',
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'number',
      description: 'Progress percentage (0-100)',
    },
    status: {
      control: 'select',
      options: ['ok', 'warning', 'danger'],
      description: 'Color status variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Bar height',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show percentage label',
    },
    animate: {
      control: 'boolean',
      description: 'Enable animation',
    },
  },
};

export default meta;

type Story = StoryObj;

export const Ok: Story = {
  args: {
    value: 45,
    status: 'ok',
    size: 'md',
    showLabel: false,
    animate: true,
  },
  render: (args) => html`
    <progress-bar
      value="${args.value}"
      status="${args.status}"
      size="${args.size}"
      ?showLabel="${args.showLabel}"
      ?animate="${args.animate}"
    ></progress-bar>
  `,
};

export const Warning: Story = {
  args: {
    value: 82,
    status: 'warning',
    size: 'md',
    showLabel: false,
    animate: true,
  },
  render: (args) => html`
    <progress-bar
      value="${args.value}"
      status="${args.status}"
      size="${args.size}"
      ?showLabel="${args.showLabel}"
      ?animate="${args.animate}"
    ></progress-bar>
  `,
};

export const Danger: Story = {
  args: {
    value: 105,
    status: 'danger',
    size: 'md',
    showLabel: false,
    animate: true,
  },
  render: (args) => html`
    <progress-bar
      value="${args.value}"
      status="${args.status}"
      size="${args.size}"
      ?showLabel="${args.showLabel}"
      ?animate="${args.animate}"
    ></progress-bar>
  `,
};

export const WithLabel: Story = {
  args: {
    value: 67,
    status: 'ok',
    size: 'md',
    showLabel: true,
    animate: true,
  },
  render: (args) => html`
    <progress-bar
      value="${args.value}"
      status="${args.status}"
      size="${args.size}"
      ?showLabel="${args.showLabel}"
      ?animate="${args.animate}"
    ></progress-bar>
  `,
};

export const Sizes: Story = {
  args: {
    value: 50,
    status: 'ok',
    size: 'md',
    showLabel: false,
    animate: false,
  },
  render: (args) => html`
    <div class="space-y-4 p-4">
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Small</span>
        <progress-bar value="${args.value}" status="${args.status}" size="sm"></progress-bar>
      </div>
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Medium</span>
        <progress-bar value="${args.value}" status="${args.status}" size="md"></progress-bar>
      </div>
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Large</span>
        <progress-bar value="${args.value}" status="${args.status}" size="lg"></progress-bar>
      </div>
    </div>
  `,
};

export const AllStatuses: Story = {
  args: {
    value: 50,
    status: 'ok',
    size: 'md',
    showLabel: false,
    animate: false,
  },
  render: (args) => html`
    <div class="space-y-4 p-4">
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">OK (Under 80%)</span>
        <progress-bar
          value="45"
          status="ok"
          size="${args.size}"
          ?showLabel="${args.showLabel}"
        ></progress-bar>
      </div>
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Warning (80-99%)</span>
        <progress-bar
          value="85"
          status="warning"
          size="${args.size}"
          ?showLabel="${args.showLabel}"
        ></progress-bar>
      </div>
      <div>
        <span class="text-xs font-bold text-base-content/60 mb-2 block">Danger (100%+)</span>
        <progress-bar
          value="105"
          status="danger"
          size="${args.size}"
          ?showLabel="${args.showLabel}"
        ></progress-bar>
      </div>
    </div>
  `,
};

// Register custom element for Storybook
customElements.define(
  'progress-bar',
  class extends HTMLElement {
    connectedCallback() {
      const value = Number(this.getAttribute('value') ?? '0');
      const status = this.getAttribute('status') ?? 'ok';
      const size = this.getAttribute('size') ?? 'md';
      const showLabel = this.hasAttribute('showLabel');
      const animate = this.hasAttribute('animate');

      this.className = 'block p-4';

      // Create inner HTML structure
      const clampedValue = Math.max(0, Math.min(100, value));

      const sizeClasses: Record<string, string> = { sm: 'h-2', md: 'h-3', lg: 'h-4' };
      const statusClasses: Record<string, string> = {
        ok: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-error',
      };
      const statusBadgeClasses: Record<string, string> = {
        ok: 'text-success bg-success/10',
        warning: 'text-warning bg-warning/10',
        danger: 'text-error bg-error/10',
      };

      this.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-full bg-base-300 rounded-full overflow-hidden shadow-inner ${sizeClasses[size]}" role="progressbar" aria-valuenow="${clampedValue}" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full transition-all duration-1000 shadow-md ${animate ? 'animate-in slide-in-from-left' : ''} ${statusClasses[status]}" style="width: ${clampedValue}%"></div>
          </div>
          ${showLabel ? `<span class="text-xs font-bold tracking-wider uppercase ${statusBadgeClasses[status]} px-2 py-1 rounded-full shrink-0">${clampedValue}% used</span>` : ''}
        </div>
      `;
    }
  }
);
