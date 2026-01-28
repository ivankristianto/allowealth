import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/ToastContainer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Position | Fixed top-right | \`fixed top-4 right-4\` |
| Z-Index | 50 | \`z-50\` |
| Stack Gap | 12px | \`gap-3\` |
| Max Width | 400px | \`max-w-md\` |
| Container | Flex column | \`flex flex-col\` |

### Toast Item Styling

| Property | Value | Class |
|----------|-------|-------|
| Dismiss Icon | 16px | \`X size={16}\` |
| Alert Classes | DaisyUI | \`alert alert-{success|error|warning|info}\` |
| Shadow | Large | \`shadow-lg\` |
| Border Radius | rounded-lg | Standard rounding |

### Accessibility

- Container: \`aria-live="polite"\` for non-error toasts
- Container: \`aria-live="assertive"\` for error toasts
- Container: \`role="region"\` with \`aria-label="Notifications"\`
- Individual toasts: \`role="alert"\`
- Dismiss button: \`aria-label="Dismiss"\`
- Icons: \`aria-hidden="true"\` (decorative)

### Animation

- Entry: Slide in from right (\`x: 100\` to \`x: 0\`) with opacity
- Exit: Slide out to right with fade
- Duration: 200ms with ease timing
- Stagger: 50ms between multiple toasts

### Behavior

- Auto-dismiss after timeout (configurable per toast)
- Manual dismiss via X button
- Stack order: newest on top
- Max visible: Configurable (default unlimited)

### Props

- **position**: top-right | top-left | bottom-right | bottom-left
- **maxToasts**: Maximum visible toasts (0 = unlimited)
        `,
      },
    },
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
      description: 'Toast container position',
    },
  },
};

export default meta;

/**
 * Helper function to create a single toast
 */
function createToast(args: {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}): HTMLElement {
  const { message, type } = args;

  const toast = document.createElement('div');
  toast.className = `alert alert-${type} shadow-lg rounded-lg`;
  toast.setAttribute('role', 'alert');

  const content = document.createElement('span');
  content.textContent = message;
  toast.appendChild(content);

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn btn-ghost btn-sm';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  `;
  toast.appendChild(dismissBtn);

  return toast;
}

/**
 * Helper function to create ToastContainer
 */
function createToastContainer(args: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  toasts?: Array<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>;
}): HTMLElement {
  const { position = 'top-right', toasts = [] } = args;

  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Wrapper to simulate fixed positioning in Storybook
  const wrapper = document.createElement('div');
  wrapper.className = 'relative h-64 w-full bg-base-200 rounded-lg overflow-hidden';

  const container = document.createElement('div');
  container.className = `absolute ${positionClasses[position]} z-50 flex flex-col gap-3 max-w-md`;
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Notifications');
  container.setAttribute('aria-live', 'polite');

  toasts.forEach((toast) => {
    container.appendChild(createToast(toast));
  });

  wrapper.appendChild(container);
  return wrapper;
}

// Default (Empty)
export const Default: StoryObj = {
  args: {
    position: 'top-right',
  },
  render: (args) =>
    createToastContainer({
      ...args,
      toasts: [{ message: 'Changes saved successfully!', type: 'success' }],
    }),
};

// Multiple Toasts
export const MultipleToasts: StoryObj = {
  render: () =>
    createToastContainer({
      position: 'top-right',
      toasts: [
        { message: 'Changes saved successfully!', type: 'success' },
        { message: 'New updates are available.', type: 'info' },
        { message: 'Your session will expire soon.', type: 'warning' },
      ],
    }),
};

// Error Toast
export const ErrorToast: StoryObj = {
  render: () =>
    createToastContainer({
      position: 'top-right',
      toasts: [{ message: 'Failed to save. Please try again.', type: 'error' }],
    }),
};

// All Positions
export const AllPositions: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-2 gap-4';

    const positions: Array<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'> = [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ];

    positions.forEach((position) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';

      const label = document.createElement('p');
      label.className = 'text-sm font-medium text-base-content/60';
      label.textContent = position;
      wrapper.appendChild(label);

      wrapper.appendChild(
        createToastContainer({
          position,
          toasts: [{ message: `Toast at ${position}`, type: 'info' }],
        })
      );

      container.appendChild(wrapper);
    });

    return container;
  },
};
