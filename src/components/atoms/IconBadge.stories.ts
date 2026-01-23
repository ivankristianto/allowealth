import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Atoms/IconBadge',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'accent', 'success', 'warning', 'error', 'info', 'neutral'],
      description: 'Color variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size',
    },
    outlined: {
      control: 'boolean',
      description: 'Use outlined style',
    },
  },
};

export default meta;

type Story = StoryObj;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </icon-badge>
  `,
};

export const Accent: Story = {
  args: {
    variant: 'accent',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </icon-badge>
  `,
};

export const Success: Story = {
  args: {
    variant: 'success',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </icon-badge>
  `,
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    </icon-badge>
  `,
};

export const Error: Story = {
  args: {
    variant: 'error',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    </icon-badge>
  `,
};

export const Info: Story = {
  args: {
    variant: 'info',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </icon-badge>
  `,
};

export const Outlined: Story = {
  args: {
    variant: 'warning',
    size: 'md',
    outlined: true,
  },
  render: (args) => html`
    <icon-badge variant="${args.variant}" size="${args.size}" ?outlined="${args.outlined}">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    </icon-badge>
  `,
};

export const Sizes: Story = {
  args: {
    variant: 'accent',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <div class="flex items-center gap-4 p-4">
      <div class="text-center">
        <icon-badge variant="${args.variant}" size="sm" ?outlined="${args.outlined}">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </icon-badge>
        <span class="text-xs text-base-content/60 mt-2 block">Small</span>
      </div>
      <div class="text-center">
        <icon-badge variant="${args.variant}" size="md" ?outlined="${args.outlined}">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </icon-badge>
        <span class="text-xs text-base-content/60 mt-2 block">Medium</span>
      </div>
      <div class="text-center">
        <icon-badge variant="${args.variant}" size="lg" ?outlined="${args.outlined}">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </icon-badge>
        <span class="text-xs text-base-content/60 mt-2 block">Large</span>
      </div>
    </div>
  `,
};

export const AllVariants: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    outlined: false,
  },
  render: (args) => html`
    <div class="flex flex-wrap gap-4 p-4">
      <icon-badge variant="primary" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </icon-badge>
      <icon-badge variant="accent" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </icon-badge>
      <icon-badge variant="success" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </icon-badge>
      <icon-badge variant="warning" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </icon-badge>
      <icon-badge variant="error" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </icon-badge>
      <icon-badge variant="info" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </icon-badge>
      <icon-badge variant="neutral" size="${args.size}" ?outlined="${args.outlined}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </icon-badge>
    </div>
  `,
};

// Register custom element for Storybook
customElements.define(
  'icon-badge',
  class extends HTMLElement {
    connectedCallback() {
      const variant = this.getAttribute('variant') ?? 'primary';
      const size = this.getAttribute('size') ?? 'md';
      const outlined = this.hasAttribute('outlined');

      this.className = 'inline-block';

      const sizeClasses: Record<string, string> = { sm: 'p-3', md: 'p-4', lg: 'p-5' };
      const iconSizeClasses: Record<string, string> = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
      };
      const variantClasses: Record<string, string> = {
        primary: 'bg-primary/10 text-primary',
        accent: 'bg-accent/10 text-accent',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
        info: 'bg-info/10 text-info',
        neutral: 'bg-base-300 text-base-content',
      };

      const classes = [
        'rounded-2xl shrink-0',
        sizeClasses[size],
        outlined ? 'bg-base-100 border border-base-300' : variantClasses[variant],
        !outlined && 'shadow-sm',
      ].join(' ');

      this.innerHTML = `<div class="${classes}"><span class="${iconSizeClasses[size]} block">${this.innerHTML}</span></div>`;
    }
  }
);
