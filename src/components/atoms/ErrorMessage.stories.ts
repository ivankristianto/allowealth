import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { CircleX, X } = IconRenderers;

const meta: Meta = {
  title: 'Atoms/ErrorMessage',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Icon Migration

Uses Lucide icons instead of inline SVGs for consistency:

| Icon | Lucide Component | Size | Purpose |
|------|------------------|------|---------|
| Error Icon | \`CircleX\` | 24px (h-6 w-6) | Visual error indicator |
| Dismiss Icon | \`X\` | 16px (h-4 w-4) | Close button icon |

### Variants

| Variant | Classes | Use Case |
|---------|---------|----------|
| alert | \`alert alert-error\` | Standard form/page errors |
| banner | \`alert alert-error shadow-lg\` | Prominent error banners |
| inline | \`text-error text-sm\` | Field-level validation errors |

### Structure

**Alert/Banner variants:**
- Container: \`div\` with \`role="alert"\`
- Icon: \`CircleX\` with \`shrink-0\` class
- Content: \`div\` containing optional title (\`font-bold\`) and message (\`text-xs\`)
- Dismiss: Optional \`button\` with \`X\` icon

**Inline variant:**
- Container: \`span\` with \`role="alert"\`
- No icon, no dismiss button

### Accessibility

| Feature | Implementation |
|---------|----------------|
| Role | \`role="alert"\` on container (all variants) |
| Dismiss Button | \`aria-label="Dismiss"\` |
| Icons | \`aria-hidden="true"\` (decorative) |
| Button Type | \`type="button"\` (prevents form submission) |
| Color Contrast | DaisyUI \`alert-error\` ensures WCAG compliance |

### Typography

| Element | Class |
|---------|-------|
| Title | \`font-bold\` |
| Message (alert/banner) | \`text-xs\` |
| Message (inline) | \`text-sm\` |
| Dismiss Button | \`btn btn-sm btn-ghost\` |
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['alert', 'banner', 'inline'],
    },
    dismissible: { control: 'boolean' },
  },
};

export default meta;

const createErrorMessage = (args: {
  title?: string;
  message?: string;
  variant?: string;
  dismissible?: boolean;
}): HTMLElement => {
  const {
    title = 'Error',
    message = 'Something went wrong. Please try again.',
    variant = 'alert',
    dismissible = false,
  } = args;

  if (variant === 'inline') {
    const span = document.createElement('span');
    span.className = 'text-error text-sm';
    span.textContent = message;
    span.setAttribute('role', 'alert');
    return span;
  }

  const div = document.createElement('div');
  div.className = variant === 'banner' ? 'alert alert-error shadow-lg' : 'alert alert-error';
  div.setAttribute('role', 'alert');

  // Icon - render CircleX from Lucide
  div.appendChild(CircleX.render({ size: 24, class: 'shrink-0' }, { 'aria-hidden': 'true' }));

  // Content
  const content = document.createElement('div');
  if (title) {
    const h3 = document.createElement('h3');
    h3.className = 'font-bold';
    h3.textContent = title;
    content.appendChild(h3);
  }
  const msg = document.createElement('div');
  msg.className = 'text-xs';
  msg.textContent = message;
  content.appendChild(msg);
  div.appendChild(content);

  // Dismissible button
  if (dismissible) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-ghost';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Dismiss');
    btn.appendChild(X.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' }));
    div.appendChild(btn);
  }

  return div;
};

export const Alert: StoryObj = {
  args: {
    title: 'Error Occurred',
    message: 'Failed to save expense. Please check your input and try again.',
    variant: 'alert',
  },
  render: (args) => createErrorMessage(args),
};

export const Banner: StoryObj = {
  args: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    variant: 'banner',
  },
  render: (args) => createErrorMessage(args),
};

export const Inline: StoryObj = {
  args: {
    message: 'This field is required',
    variant: 'inline',
  },
  render: (args) => createErrorMessage(args),
};

export const Dismissible: StoryObj = {
  args: {
    title: 'Warning',
    message: 'You have unsaved changes. Are you sure you want to leave?',
    variant: 'alert',
    dismissible: true,
  },
  render: (args) => createErrorMessage(args),
};

export const FormErrors: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'card bg-base-100 card-bordered p-6';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = 'Add Expense';

    const alert = createErrorMessage({
      title: 'Form Validation Error',
      message: 'Please fix the following errors before submitting.',
      variant: 'alert',
    });

    const form = document.createElement('div');
    form.className = 'space-y-4 mt-4';

    const fields = [
      { label: 'Amount', error: 'Please enter a valid amount' },
      { label: 'Category', error: 'Please select a category' },
      { label: 'Date', error: 'Date cannot be in the future' },
    ];

    fields.forEach((field) => {
      const group = document.createElement('div');
      group.className = 'form-control';

      const label = document.createElement('label');
      label.className = 'label';
      label.innerHTML = `<span class="label-text">${field.label}</span>`;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input input-bordered input-error';
      input.setAttribute('aria-invalid', 'true');

      const errorMsg = createErrorMessage({ message: field.error, variant: 'inline' });

      group.appendChild(label);
      group.appendChild(input);
      group.appendChild(errorMsg);
      form.appendChild(group);
    });

    container.appendChild(title);
    container.appendChild(alert);
    container.appendChild(form);

    return container;
  },
};

export const BudgetAlert: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-4';

    const alerts = [
      {
        title: 'Budget Exceeded',
        message: 'You have exceeded your dining out budget by Rp 500,000 this month.',
        variant: 'banner' as const,
      },
      {
        title: 'Warning',
        message: 'Your entertainment budget is at 85%. Consider reducing spending.',
        variant: 'alert' as const,
      },
    ];

    alerts.forEach((alert) => {
      container.appendChild(createErrorMessage({ ...alert, dismissible: true }));
    });

    return container;
  },
};
