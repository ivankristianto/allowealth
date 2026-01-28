import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/ForgotPasswordForm',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Form Width | max-w-sm | \`max-w-sm mx-auto\` |
| Form Gap | 16px | \`flex flex-col gap-4\` |
| Input Height | 40px | \`h-10\` |
| Input Padding | 8px 12px | \`px-3 py-2\` |
| Input Background | bg-base-200 | DaisyUI base |
| Focus Ring | ring-accent | \`focus:ring-2 focus:ring-accent\` |

### Icons

| Icon | Size | Class | Usage |
|------|------|-------|-------|
| CircleCheck | 24px | \`h-6 w-6 stroke-current\` | Success state |
| CircleX | 24px | \`h-6 w-6 stroke-current\` | Error state |

### Message States

| State | Alert Class | Icon |
|-------|-------------|------|
| Success | alert-success | CircleCheck |
| Error | alert-error | CircleX |

### Accessibility

- \`aria-live="polite"\` on message container
- Labels associated with inputs via \`for\` attribute
- Error messages with \`role="alert"\`
- Submit button disabled during loading
- Focus management after submission

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | email input | Yes | Valid email format |

### Button States

| State | Classes |
|-------|---------|
| Default | \`btn btn-accent\` |
| Loading | \`btn btn-accent loading\` |
| Disabled | \`btn btn-accent btn-disabled\` |

### Props

- **state**: idle | loading | success | error
- **errorMessage**: Error message to display
- **successMessage**: Success message to display
        `,
      },
    },
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'loading', 'success', 'error'],
      description: 'Form state',
    },
  },
};

export default meta;

/**
 * Helper function to create ForgotPasswordForm
 */
function createForgotPasswordForm(args: {
  state?: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
  successMessage?: string;
}): HTMLElement {
  const {
    state = 'idle',
    errorMessage = 'No account found with this email address.',
    successMessage = 'Password reset link sent! Check your email.',
  } = args;

  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-sm mx-auto';

  const form = document.createElement('form');
  form.className = 'flex flex-col gap-4';

  // Title
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-center';
  title.textContent = 'Forgot Password';
  form.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.className = 'text-sm text-base-content/60 text-center';
  desc.textContent = "Enter your email and we'll send you a reset link.";
  form.appendChild(desc);

  // Message container
  if (state === 'success' || state === 'error') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${state === 'success' ? 'alert-success' : 'alert-error'}`;
    messageDiv.setAttribute('aria-live', 'polite');
    if (state === 'error') messageDiv.setAttribute('role', 'alert');

    const icon = document.createElement('span');
    icon.innerHTML =
      state === 'success'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 stroke-current" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 stroke-current" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
    messageDiv.appendChild(icon);

    const messageText = document.createElement('span');
    messageText.textContent = state === 'success' ? successMessage : errorMessage;
    messageDiv.appendChild(messageText);

    form.appendChild(messageDiv);
  }

  // Email field
  const emailGroup = document.createElement('div');
  emailGroup.className = 'form-control';
  emailGroup.innerHTML = `
    <label class="label" for="email">
      <span class="label-text">Email</span>
    </label>
    <input
      type="email"
      id="email"
      name="email"
      placeholder="you@example.com"
      class="input input-bordered h-10 px-3 py-2 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none"
      required
      ${state === 'loading' ? 'disabled' : ''}
    />
  `;
  form.appendChild(emailGroup);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = `btn btn-accent ${state === 'loading' ? 'loading' : ''}`;
  submitBtn.disabled = state === 'loading';
  submitBtn.textContent = state === 'loading' ? 'Sending...' : 'Send Reset Link';
  form.appendChild(submitBtn);

  // Back to login link
  const backLink = document.createElement('a');
  backLink.href = '/login';
  backLink.className = 'text-sm text-accent hover:underline text-center';
  backLink.textContent = 'Back to Login';
  form.appendChild(backLink);

  wrapper.appendChild(form);
  return wrapper;
}

// Default
export const Default: StoryObj = {
  args: {
    state: 'idle',
  },
  render: (args) => createForgotPasswordForm(args),
};

// Loading
export const Loading: StoryObj = {
  args: {
    state: 'loading',
  },
  render: (args) => createForgotPasswordForm(args),
};

// Success
export const Success: StoryObj = {
  args: {
    state: 'success',
    successMessage: 'Password reset link sent! Check your email.',
  },
  render: (args) => createForgotPasswordForm(args),
};

// Error
export const Error: StoryObj = {
  args: {
    state: 'error',
    errorMessage: 'No account found with this email address.',
  },
  render: (args) => createForgotPasswordForm(args),
};

// All States
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-8';

    const states: Array<{
      state: 'idle' | 'loading' | 'success' | 'error';
      label: string;
    }> = [
      { state: 'idle', label: 'Idle' },
      { state: 'loading', label: 'Loading' },
      { state: 'success', label: 'Success' },
      { state: 'error', label: 'Error' },
    ];

    states.forEach(({ state, label }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';

      const stateLabel = document.createElement('p');
      stateLabel.className = 'text-sm font-medium text-base-content/60 text-center';
      stateLabel.textContent = label;
      wrapper.appendChild(stateLabel);

      wrapper.appendChild(createForgotPasswordForm({ state }));
      container.appendChild(wrapper);
    });

    return container;
  },
};
