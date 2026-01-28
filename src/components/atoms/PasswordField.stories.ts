import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/PasswordField',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Accessibility

All decorative icons use \`aria-hidden="true"\` to prevent screen reader announcement.

#### Visibility Toggle Icons

| Icon | Component | Size | Attribute |
|------|-----------|------|-----------|
| Show password | \`Eye\` | 20px | \`aria-hidden="true"\` |
| Hide password | \`EyeOff\` | 20px | \`aria-hidden="true"\` |

The toggle button provides the accessible name via \`aria-label\`:
- Initial: "Toggle password visibility"
- After toggle: "Show password" / "Hide password"

#### Requirements List Icons

| Icon | Component | Size | Attribute |
|------|-----------|------|-----------|
| Requirement met | \`Check\` | 16px | \`aria-hidden="true"\` |
| Requirement not met | \`X\` | 16px | \`aria-hidden="true"\` |

The requirements list is labeled with \`aria-label="Password requirements"\`.

### Password Requirements

The component validates against 3 requirements:

| Requirement | Key | Validation |
|-------------|-----|------------|
| Length | \`length\` | >= 12 characters |
| Letter | \`letter\` | Contains A-Z or a-z |
| Number/Special | \`numberOrSpecial\` | Contains 0-9 or special character |

### Strength Meter

Strength is calculated based on requirements passed:

| Passed | Strength | Color |
|--------|----------|-------|
| 0-1 | Weak | \`bg-error\` |
| 2-3 | Medium | \`bg-warning\` |
| 4+ | Strong | \`bg-success\` |

### Features

| Feature | Prop | Description |
|---------|------|-------------|
| Visibility Toggle | Built-in | Eye/EyeOff icon button |
| Strength Meter | \`showStrength\` | 4-bar visual indicator |
| Requirements List | \`showRequirements\` | Checklist with icons |
| Error State | \`error\` + \`errorMessage\` | Red border and message |
| Disabled | \`disabled\` | Non-interactive state |
        `,
      },
    },
  },
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the password field',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the password field',
    },
    error: {
      control: 'boolean',
      description: 'Show error state',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display',
    },
    showStrength: {
      control: 'boolean',
      description: 'Show password strength meter',
    },
    showRequirements: {
      control: 'boolean',
      description: 'Show password requirements checklist',
    },
  },
};

export default meta;

const createPasswordField = (args: {
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  value?: string;
  showStrength?: boolean;
  showRequirements?: boolean;
}): HTMLElement => {
  const {
    placeholder = 'Enter password',
    disabled = false,
    error = false,
    errorMessage = '',
    value = '',
    showStrength = false,
    showRequirements = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full max-w-md';

  const uniqueId = `password-field-${Math.random().toString(36).substring(2, 9)}`;

  // Create label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'label';

  const labelText = document.createElement('span');
  labelText.className = 'label-text';
  labelText.textContent = 'Password';

  labelDiv.appendChild(labelText);
  container.appendChild(labelDiv);

  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'relative';

  // Create input
  const input = document.createElement('input');
  input.id = uniqueId;
  input.name = 'password';
  input.type = 'password';
  input.placeholder = placeholder;
  input.value = value;
  input.disabled = disabled;
  input.className = `input input-bordered w-full pr-12 ${error ? 'input-error' : ''} ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;
  input.setAttribute('data-password-input', '');
  input.setAttribute('data-show-strength', showStrength ? 'true' : 'false');

  inputContainer.appendChild(input);

  // Create toggle button
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-circle btn-sm';
  button.setAttribute('aria-label', 'Toggle password visibility');
  button.setAttribute('data-toggle-password', uniqueId);
  if (disabled) button.disabled = true;

  // Eye icon (show) - using Lucide icon
  const eyeIcon = document.createElement('div');
  eyeIcon.className = 'stroke-current';
  eyeIcon.setAttribute('data-eye-icon', '');
  eyeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;

  // Eye slash icon (hide) - using Lucide icon
  const eyeOffIcon = document.createElement('div');
  eyeOffIcon.className = 'hidden stroke-current';
  eyeOffIcon.setAttribute('data-eye-off-icon', '');
  eyeOffIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

  button.appendChild(eyeIcon);
  button.appendChild(eyeOffIcon);
  inputContainer.appendChild(button);
  container.appendChild(inputContainer);

  // Add toggle functionality
  button.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.classList.add('hidden');
      eyeOffIcon.classList.remove('hidden');
      button.setAttribute('aria-label', 'Hide password');
    } else {
      input.type = 'password';
      eyeIcon.classList.remove('hidden');
      eyeOffIcon.classList.add('hidden');
      button.setAttribute('aria-label', 'Show password');
    }
  });

  // Strength meter
  if (showStrength) {
    const strengthDiv = document.createElement('div');
    strengthDiv.className = 'mt-2 space-y-2';

    const barsDiv = document.createElement('div');
    barsDiv.className = 'flex gap-1';

    for (let i = 1; i <= 4; i++) {
      const bar = document.createElement('div');
      bar.className = 'h-1 flex-1 rounded-full bg-base-300 transition-all duration-300';
      bar.setAttribute('data-strength-bar', i.toString());
      barsDiv.appendChild(bar);
    }

    const strengthText = document.createElement('p');
    strengthText.className = 'text-xs';
    strengthText.innerHTML = 'Password strength: <span data-strength-label>Not entered</span>';

    strengthDiv.appendChild(barsDiv);
    strengthDiv.appendChild(strengthText);
    container.appendChild(strengthDiv);

    // Add strength calculation
    input.addEventListener('input', () => {
      const password = input.value;
      // Validation matching component logic (3 requirements: length, letter, numberOrSpecial)
      const checks = {
        length: password.length >= 12,
        letter: /[a-zA-Z]/.test(password),
        numberOrSpecial: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      };

      const passedCount = Object.values(checks).filter(Boolean).length;
      const strengthLabel = strengthDiv.querySelector('[data-strength-label]') as HTMLElement;
      const bars = strengthDiv.querySelectorAll('[data-strength-bar]');

      let strength = 'weak';
      let colorClass = 'bg-error';

      if (passedCount <= 1) {
        strength = password.length === 0 ? 'Not entered' : 'Weak';
        colorClass = 'bg-error';
      } else if (passedCount <= 3) {
        strength = 'Medium';
        colorClass = 'bg-warning';
      } else {
        strength = 'Strong';
        colorClass = 'bg-success';
      }

      if (strengthLabel) {
        strengthLabel.textContent = strength;
      }

      bars.forEach((bar, index) => {
        bar.classList.remove('bg-error', 'bg-warning', 'bg-success');
        if (password.length === 0) {
          bar.classList.add('bg-base-300');
        } else if (index < passedCount) {
          bar.classList.remove('bg-base-300');
          bar.classList.add(colorClass);
        } else {
          bar.classList.remove('bg-base-300');
          bar.classList.add(colorClass, 'opacity-30');
        }
      });
    });
  }

  // Requirements checklist
  if (showRequirements) {
    const requirementsList = document.createElement('ul');
    requirementsList.className = 'mt-2 space-y-1 text-xs';
    requirementsList.setAttribute('aria-label', 'Password requirements');

    const requirements = [
      { key: 'length', text: 'At least 12 characters' },
      { key: 'letter', text: 'At least one letter (A-Z or a-z)' },
      { key: 'numberOrSpecial', text: 'At least one number or special character' },
    ];

    requirements.forEach(({ key, text }) => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-2 text-base-content/60';
      li.setAttribute('data-requirement', key);

      // Check icon - using Lucide Check icon
      const checkIcon = document.createElement('div');
      checkIcon.className = 'hidden shrink-0';
      checkIcon.setAttribute('data-check-icon', '');
      checkIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

      // X icon - using Lucide X icon
      const xIcon = document.createElement('div');
      xIcon.className = 'shrink-0';
      xIcon.setAttribute('data-x-icon', '');
      xIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

      const span = document.createElement('span');
      span.textContent = text;

      li.appendChild(checkIcon);
      li.appendChild(xIcon);
      li.appendChild(span);
      requirementsList.appendChild(li);
    });

    container.appendChild(requirementsList);

    // Add requirement checking
    input.addEventListener('input', () => {
      const password = input.value;
      // Validation matching component logic (3 requirements: length, letter, numberOrSpecial)
      const checks = {
        length: password.length >= 12,
        letter: /[a-zA-Z]/.test(password),
        numberOrSpecial: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      };

      Object.entries(checks).forEach(([key, passed]) => {
        const item = requirementsList.querySelector(`[data-requirement="${key}"]`) as HTMLElement;
        if (item) {
          const checkIcon = item.querySelector('[data-check-icon]') as HTMLElement;
          const xIcon = item.querySelector('[data-x-icon]') as HTMLElement;

          if (passed) {
            item.classList.remove('text-base-content/60');
            item.classList.add('text-success');
            checkIcon?.classList.remove('hidden');
            xIcon?.classList.add('hidden');
          } else {
            item.classList.remove('text-success');
            item.classList.add('text-base-content/60');
            checkIcon?.classList.add('hidden');
            xIcon?.classList.remove('hidden');
          }
        }
      });
    });
  }

  // Error message
  if (error && errorMessage) {
    const errorSpan = document.createElement('span');
    errorSpan.className = 'text-error text-sm mt-1 block';
    errorSpan.setAttribute('role', 'alert');
    errorSpan.textContent = errorMessage;
    container.appendChild(errorSpan);
  }

  return container;
};

// Default
export const Default: StoryObj = {
  args: {
    placeholder: 'Enter password',
  },
  render: (args) => createPasswordField(args),
};

// With Value
export const WithValue: StoryObj = {
  args: {
    placeholder: 'Enter password',
    value: 'secretpassword123',
  },
  render: (args) => createPasswordField(args),
};

// Error State
export const Error: StoryObj = {
  args: {
    placeholder: 'Enter password',
    error: true,
    errorMessage: 'Password must be at least 12 characters',
  },
  render: (args) => createPasswordField(args),
};

// Disabled
export const Disabled: StoryObj = {
  args: {
    placeholder: 'Enter password',
    disabled: true,
  },
  render: (args) => createPasswordField(args),
};

// With Strength Meter
export const WithStrengthMeter: StoryObj = {
  args: {
    placeholder: 'Enter password',
    showStrength: true,
  },
  render: (args) => createPasswordField(args),
};

// With Requirements
export const WithRequirements: StoryObj = {
  args: {
    placeholder: 'Enter password',
    showRequirements: true,
  },
  render: (args) => createPasswordField(args),
};

// With Strength And Requirements
export const WithStrengthAndRequirements: StoryObj = {
  args: {
    placeholder: 'Enter password',
    showStrength: true,
    showRequirements: true,
  },
  render: (args) => createPasswordField(args),
};

// Required With Strength
export const RequiredWithStrength: StoryObj = {
  args: {
    placeholder: 'Must be at least 12 characters',
    showStrength: true,
    showRequirements: true,
  },
  render: (args) => createPasswordField(args),
};

// Custom Id
export const CustomId: StoryObj = {
  args: {
    placeholder: 'Enter password',
  },
  render: (args) => createPasswordField(args),
};

// Empty State
export const EmptyState: StoryObj = {
  args: {
    placeholder: '',
  },
  render: (args) => createPasswordField(args),
};

// Focused
export const Focused: StoryObj = {
  args: {
    showStrength: true,
    showRequirements: true,
  },
  render: (args) => {
    const field = createPasswordField(args);
    // Note: Focus state is handled via user interaction in Storybook
    return field;
  },
  parameters: {
    docs: {
      description: {
        story:
          'Click on the input to see the focus state. The component will highlight and be ready for input.',
      },
    },
  },
};
