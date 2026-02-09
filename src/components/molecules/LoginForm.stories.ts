import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/LoginForm',
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
| CircleX | 24px | \`h-6 w-6 stroke-current\` | Error messages |
| Eye | 20px | \`h-5 w-5\` | Show password toggle |
| EyeOff | 20px | \`h-5 w-5\` | Hide password toggle |

### Error Display

| Property | Value | Class |
|----------|-------|-------|
| Container | DaisyUI alert | \`alert alert-error\` |
| Icon | CircleX 24px | \`h-6 w-6 stroke-current\` |
| Text | text-sm | Error message text |

### Accessibility

- Labels associated with inputs via \`for\` attribute
- Error messages with \`role="alert"\`
- Password toggle with \`aria-label\`
- \`aria-describedby\` for password requirements
- Submit button disabled during loading

### Form Fields

| Field | Type | Required | Features |
|-------|------|----------|----------|
| Email | email input | Yes | Autocomplete |
| Password | password input | Yes | Show/hide toggle |
| Remember Me | checkbox | No | Session persistence |

### Button States

| State | Classes |
|-------|---------|
| Default | \`btn btn-accent w-full\` |
| Loading | \`btn btn-accent w-full loading\` |
| Disabled | \`btn btn-accent w-full btn-disabled\` |

### Props

- **state**: idle | loading | error
- **errorMessage**: Error message to display
- **showRememberMe**: Show remember me checkbox (default: true)
        `,
      },
    },
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'loading', 'error'],
      description: 'Form state',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display',
    },
    showRememberMe: {
      control: 'boolean',
      description: 'Show remember me checkbox',
    },
  },
};

export default meta;

/**
 * Helper function to create LoginForm
 */
function createLoginForm(args: {
  state?: 'idle' | 'loading' | 'error';
  errorMessage?: string;
  showRememberMe?: boolean;
}): HTMLElement {
  const {
    state = 'idle',
    errorMessage = 'Invalid email or password.',
    showRememberMe = true,
  } = args;

  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-sm mx-auto';

  const form = document.createElement('form');
  form.className = 'flex flex-col gap-4';

  // Title
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-center';
  title.textContent = 'Welcome Back';
  form.appendChild(title);

  // Error message
  if (state === 'error') {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.setAttribute('role', 'alert');

    const icon = document.createElement('span');
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 stroke-current" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
    errorDiv.appendChild(icon);

    const errorText = document.createElement('span');
    errorText.textContent = errorMessage;
    errorDiv.appendChild(errorText);

    form.appendChild(errorDiv);
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
      autocomplete="email"
      ${state === 'loading' ? 'disabled' : ''}
    />
  `;
  form.appendChild(emailGroup);

  // Password field with toggle
  const passwordGroup = document.createElement('div');
  passwordGroup.className = 'form-control';
  passwordGroup.innerHTML = `
    <label class="label" for="password">
      <span class="label-text">Password</span>
    </label>
    <div class="relative">
      <input
        type="password"
        id="password"
        name="password"
        placeholder="Enter your password"
        class="input input-bordered h-10 px-3 py-2 pr-10 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full"
        required
        autocomplete="current-password"
        ${state === 'loading' ? 'disabled' : ''}
      />
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
        aria-label="Toggle password visibility"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>
  `;
  form.appendChild(passwordGroup);

  // Remember me + Forgot password row
  if (showRememberMe) {
    const optionsRow = document.createElement('div');
    optionsRow.className = 'flex items-center justify-between';

    optionsRow.innerHTML = `
      <label class="label cursor-pointer gap-2">
        <input type="checkbox" name="remember" class="checkbox checkbox-sm checkbox-accent" />
        <span class="label-text">Remember me</span>
      </label>
      <a href="/forgot-password" class="text-sm text-accent hover:underline">Forgot password?</a>
    `;
    form.appendChild(optionsRow);
  }

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = `btn btn-accent w-full ${state === 'loading' ? 'loading' : ''}`;
  submitBtn.disabled = state === 'loading';
  submitBtn.textContent = state === 'loading' ? 'Signing in...' : 'Sign In';
  form.appendChild(submitBtn);

  // Sign up link
  const signupLink = document.createElement('p');
  signupLink.className = 'text-sm text-center text-base-content/60';
  signupLink.innerHTML = `Don't have an account? <a href="/signup" class="text-accent hover:underline">Sign up</a>`;
  form.appendChild(signupLink);

  wrapper.appendChild(form);
  return wrapper;
}

// Default
export const Default: StoryObj = {
  args: {
    state: 'idle',
    showRememberMe: true,
  },
  render: (args) => createLoginForm(args),
};

// Loading
export const Loading: StoryObj = {
  args: {
    state: 'loading',
    showRememberMe: true,
  },
  render: (args) => createLoginForm(args),
};

// Error
export const Error: StoryObj = {
  args: {
    state: 'error',
    errorMessage: 'Invalid email or password.',
    showRememberMe: true,
  },
  render: (args) => createLoginForm(args),
};

// Without Remember Me
export const WithoutRememberMe: StoryObj = {
  args: {
    state: 'idle',
    showRememberMe: false,
  },
  render: (args) => createLoginForm(args),
};

// All States
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-3 gap-8';

    const states: Array<{ state: 'idle' | 'loading' | 'error'; label: string }> = [
      { state: 'idle', label: 'Idle' },
      { state: 'loading', label: 'Loading' },
      { state: 'error', label: 'Error' },
    ];

    states.forEach(({ state, label }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';

      const stateLabel = document.createElement('p');
      stateLabel.className = 'text-sm font-medium text-base-content/60 text-center';
      stateLabel.textContent = label;
      wrapper.appendChild(stateLabel);

      wrapper.appendChild(createLoginForm({ state }));
      container.appendChild(wrapper);
    });

    return container;
  },
};
