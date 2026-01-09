import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/PasswordField',
  tags: ['autodocs'],
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

  // Eye icon (show)
  const eyeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eyeIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  eyeIcon.setAttribute('fill', 'none');
  eyeIcon.setAttribute('viewBox', '0 0 24 24');
  eyeIcon.setAttribute('stroke', 'currentColor');
  eyeIcon.classList.add('h-5', 'w-5');
  eyeIcon.setAttribute('data-eye-icon', '');
  eyeIcon.innerHTML = `
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
	`;

  // Eye slash icon (hide)
  const eyeOffIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eyeOffIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  eyeOffIcon.setAttribute('fill', 'none');
  eyeOffIcon.setAttribute('viewBox', '0 0 24 24');
  eyeOffIcon.setAttribute('stroke', 'currentColor');
  eyeOffIcon.classList.add('h-5', 'w-5', 'hidden');
  eyeOffIcon.setAttribute('data-eye-off-icon', '');
  eyeOffIcon.innerHTML = `
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
	`;

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
      const checks = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
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
      { key: 'uppercase', text: 'At least one uppercase letter' },
      { key: 'lowercase', text: 'At least one lowercase letter' },
      { key: 'number', text: 'At least one number' },
      { key: 'special', text: 'At least one special character' },
    ];

    requirements.forEach(({ key, text }) => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-2 text-base-content/60';
      li.setAttribute('data-requirement', key);

      const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      checkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      checkIcon.setAttribute('fill', 'none');
      checkIcon.setAttribute('viewBox', '0 0 24 24');
      checkIcon.setAttribute('stroke', 'currentColor');
      checkIcon.classList.add('h-4', 'w-4', 'hidden');
      checkIcon.setAttribute('data-check-icon', '');
      checkIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />';

      const xIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      xIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      xIcon.setAttribute('fill', 'none');
      xIcon.setAttribute('viewBox', '0 0 24 24');
      xIcon.setAttribute('stroke', 'currentColor');
      xIcon.classList.add('h-4', 'w-4');
      xIcon.setAttribute('data-x-icon', '');
      xIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';

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
      const checks = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
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
