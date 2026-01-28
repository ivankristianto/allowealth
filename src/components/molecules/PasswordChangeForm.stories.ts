import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/PasswordChangeForm',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Form Width | max-w-md | \`max-w-md\` |
| Form Gap | 16px | \`flex flex-col gap-4\` |
| Input Height | 40px | \`h-10\` |
| Input Padding | 8px 12px | \`px-3 py-2\` |
| Input Background | bg-base-200 | DaisyUI base |
| Focus Ring | ring-accent | \`focus:ring-2 focus:ring-accent\` |

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Current Password | password | Yes | Must match existing |
| New Password | password | Yes | 8+ chars, letter, number/special |
| Confirm Password | password | Yes | Must match new password |

### Password Validation

| Requirement | Rule |
|-------------|------|
| Minimum Length | 8 characters |
| Letter | At least one letter (a-z, A-Z) |
| Number/Special | At least one number or special character |

### Loading State

| Property | Value | Class |
|----------|-------|-------|
| Spinner | DaisyUI | \`loading loading-spinner\` |
| Button Text | "Changing..." | During submission |
| Inputs | Disabled | During submission |

### Toast Integration

| Action | Toast Type | Message |
|--------|------------|---------|
| Success | success | "Password changed successfully" |
| Error | error | "Failed to change password" |
| Mismatch | warning | "Passwords do not match" |

### Accessibility

- Labels associated with inputs via \`for\` attribute
- Password requirements listed with \`aria-describedby\`
- Error messages with \`role="alert"\`
- Submit button disabled during loading
- Focus management after validation errors

### Button States

| State | Classes |
|-------|---------|
| Default | \`btn btn-accent\` |
| Loading | \`btn btn-accent loading\` |
| Disabled | \`btn btn-accent btn-disabled\` |

### Props

- **state**: idle | loading | success | error
- **showRequirements**: Show password requirements (default: true)
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
    showRequirements: {
      control: 'boolean',
      description: 'Show password requirements',
    },
  },
};

export default meta;

/**
 * Helper function to create PasswordChangeForm
 */
function createPasswordChangeForm(args: {
  state?: 'idle' | 'loading' | 'success' | 'error';
  showRequirements?: boolean;
}): HTMLElement {
  const { state = 'idle', showRequirements = true } = args;

  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-md';

  const form = document.createElement('form');
  form.className = 'flex flex-col gap-4';

  // Title
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold';
  title.textContent = 'Change Password';
  form.appendChild(title);

  // Current Password field
  const currentGroup = document.createElement('div');
  currentGroup.className = 'form-control';
  currentGroup.innerHTML = `
    <label class="label" for="current-password">
      <span class="label-text">Current Password</span>
    </label>
    <input
      type="password"
      id="current-password"
      name="currentPassword"
      placeholder="Enter current password"
      class="input input-bordered h-10 px-3 py-2 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none"
      required
      ${state === 'loading' ? 'disabled' : ''}
    />
  `;
  form.appendChild(currentGroup);

  // New Password field
  const newGroup = document.createElement('div');
  newGroup.className = 'form-control';
  newGroup.innerHTML = `
    <label class="label" for="new-password">
      <span class="label-text">New Password</span>
    </label>
    <input
      type="password"
      id="new-password"
      name="newPassword"
      placeholder="Enter new password"
      class="input input-bordered h-10 px-3 py-2 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none"
      required
      aria-describedby="password-requirements"
      ${state === 'loading' ? 'disabled' : ''}
    />
  `;
  form.appendChild(newGroup);

  // Password requirements
  if (showRequirements) {
    const requirements = document.createElement('ul');
    requirements.id = 'password-requirements';
    requirements.className = 'text-xs text-base-content/60 list-disc list-inside space-y-1';
    requirements.innerHTML = `
      <li>At least 8 characters</li>
      <li>At least one letter</li>
      <li>At least one number or special character</li>
    `;
    form.appendChild(requirements);
  }

  // Confirm Password field
  const confirmGroup = document.createElement('div');
  confirmGroup.className = 'form-control';
  confirmGroup.innerHTML = `
    <label class="label" for="confirm-password">
      <span class="label-text">Confirm New Password</span>
    </label>
    <input
      type="password"
      id="confirm-password"
      name="confirmPassword"
      placeholder="Confirm new password"
      class="input input-bordered h-10 px-3 py-2 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none"
      required
      ${state === 'loading' ? 'disabled' : ''}
    />
  `;
  form.appendChild(confirmGroup);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = `btn btn-accent ${state === 'loading' ? 'loading' : ''}`;
  submitBtn.disabled = state === 'loading';

  if (state === 'loading') {
    submitBtn.innerHTML = `
      <span class="loading loading-spinner loading-sm"></span>
      Changing...
    `;
  } else {
    submitBtn.textContent = 'Change Password';
  }
  form.appendChild(submitBtn);

  wrapper.appendChild(form);
  return wrapper;
}

// Default
export const Default: StoryObj = {
  args: {
    state: 'idle',
    showRequirements: true,
  },
  render: (args) => createPasswordChangeForm(args),
};

// Loading
export const Loading: StoryObj = {
  args: {
    state: 'loading',
    showRequirements: true,
  },
  render: (args) => createPasswordChangeForm(args),
};

// Without Requirements
export const WithoutRequirements: StoryObj = {
  args: {
    state: 'idle',
    showRequirements: false,
  },
  render: (args) => createPasswordChangeForm(args),
};

// All States
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-8';

    const states: Array<{ state: 'idle' | 'loading'; label: string }> = [
      { state: 'idle', label: 'Idle' },
      { state: 'loading', label: 'Loading' },
    ];

    states.forEach(({ state, label }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';

      const stateLabel = document.createElement('p');
      stateLabel.className = 'text-sm font-medium text-base-content/60';
      stateLabel.textContent = label;
      wrapper.appendChild(stateLabel);

      wrapper.appendChild(createPasswordChangeForm({ state }));
      container.appendChild(wrapper);
    });

    return container;
  },
};
