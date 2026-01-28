import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/Toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Dismiss Icon | 16px | \`X size={16}\` |
| Icon Class | stroke-current | Inherits text color |
| Container | DaisyUI alert | \`alert alert-{type}\` |
| Border Radius | rounded-lg | Standard rounding |
| Shadow | shadow-lg | Elevated appearance |

### Toast Types

| Type | Alert Class | Use Case |
|------|-------------|----------|
| success | alert-success | Action completed successfully |
| error | alert-error | Action failed, requires attention |
| warning | alert-warning | Caution or potential issue |
| info | alert-info | Informational message |

### Accessibility

- \`role="alert"\` for important messages
- \`aria-live="polite"\` for non-urgent updates
- \`aria-live="assertive"\` for urgent messages (errors)
- Dismiss button with \`aria-label="Dismiss"\`
- \`aria-hidden="true"\` on decorative icons

### Animation

- Entry: Slide in from right with fade
- Exit: Slide out to right with fade
- Duration: 200ms
- Auto-dismiss: Configurable timeout (default 5000ms)

### Props

- **message**: Toast message text
- **type**: success | error | warning | info (default: info)
- **dismissible**: Show dismiss button (default: true)
- **duration**: Auto-dismiss time in ms (0 = no auto-dismiss)
        `,
      },
    },
  },
  argTypes: {
    message: {
      control: 'text',
      description: 'Toast message text',
    },
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Toast type/variant',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
  },
};

export default meta;

/**
 * Helper function to create Toast
 */
function createToast(args: {
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  dismissible?: boolean;
}): HTMLElement {
  const { message = 'This is a toast message', type = 'info', dismissible = true } = args;

  const toast = document.createElement('div');
  toast.className = `alert alert-${type} shadow-lg rounded-lg`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

  const content = document.createElement('span');
  content.textContent = message;
  toast.appendChild(content);

  if (dismissible) {
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn-ghost btn-sm';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    `;
    toast.appendChild(dismissBtn);
  }

  return toast;
}

// Default
export const Default: StoryObj = {
  args: {
    message: 'This is a toast message',
    type: 'info',
    dismissible: true,
  },
  render: (args) => createToast(args),
};

// Success
export const Success: StoryObj = {
  args: {
    message: 'Changes saved successfully!',
    type: 'success',
    dismissible: true,
  },
  render: (args) => createToast(args),
};

// Error
export const Error: StoryObj = {
  args: {
    message: 'Failed to save. Please try again.',
    type: 'error',
    dismissible: true,
  },
  render: (args) => createToast(args),
};

// Warning
export const Warning: StoryObj = {
  args: {
    message: 'Your session will expire soon.',
    type: 'warning',
    dismissible: true,
  },
  render: (args) => createToast(args),
};

// All Types
export const AllTypes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 max-w-md';

    const types: Array<{ type: 'success' | 'error' | 'warning' | 'info'; message: string }> = [
      { type: 'success', message: 'Changes saved successfully!' },
      { type: 'error', message: 'Failed to save. Please try again.' },
      { type: 'warning', message: 'Your session will expire soon.' },
      { type: 'info', message: 'New updates are available.' },
    ];

    types.forEach(({ type, message }) => {
      container.appendChild(createToast({ type, message }));
    });

    return container;
  },
};
