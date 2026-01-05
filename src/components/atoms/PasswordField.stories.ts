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
  },
};

export default meta;

const createPasswordField = (args: {
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  value?: string;
}): HTMLElement => {
  const {
    placeholder = 'Enter password',
    disabled = false,
    error = false,
    errorMessage = '',
    value = '',
  } = args;

  const container = document.createElement('div');
  container.className = 'relative w-full max-w-md';

  const uniqueId = `password-field-${Math.random().toString(36).substring(2, 9)}`;

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

  // Create toggle button
  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    'absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors';
  button.setAttribute('aria-label', 'Toggle password visibility');
  button.setAttribute('data-password-toggle', '');
  button.setAttribute('data-target', uniqueId);
  if (disabled) button.disabled = true;

  // Eye icon (show)
  const eyeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eyeIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  eyeIcon.setAttribute('fill', 'none');
  eyeIcon.setAttribute('viewBox', '0 0 24 24');
  eyeIcon.setAttribute('stroke-width', '1.5');
  eyeIcon.setAttribute('stroke', 'currentColor');
  eyeIcon.classList.add('w-5', 'h-5');
  eyeIcon.setAttribute('data-eye-icon', '');
  eyeIcon.innerHTML = `
    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  `;

  // Eye slash icon (hide)
  const eyeSlashIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eyeSlashIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  eyeSlashIcon.setAttribute('fill', 'none');
  eyeSlashIcon.setAttribute('viewBox', '0 0 24 24');
  eyeSlashIcon.setAttribute('stroke-width', '1.5');
  eyeSlashIcon.setAttribute('stroke', 'currentColor');
  eyeSlashIcon.classList.add('w-5', 'h-5', 'hidden');
  eyeSlashIcon.setAttribute('data-eye-slash-icon', '');
  eyeSlashIcon.innerHTML = `
    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  `;

  button.appendChild(eyeIcon);
  button.appendChild(eyeSlashIcon);

  // Add toggle functionality
  button.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.classList.add('hidden');
      eyeSlashIcon.classList.remove('hidden');
      button.setAttribute('aria-label', 'Hide password');
    } else {
      input.type = 'password';
      eyeIcon.classList.remove('hidden');
      eyeSlashIcon.classList.add('hidden');
      button.setAttribute('aria-label', 'Show password');
    }
  });

  container.appendChild(input);
  container.appendChild(button);

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

// With Label
export const WithLabel: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'form-control max-w-md';

    const label = document.createElement('label');
    label.className = 'label';
    label.htmlFor = 'password-with-label';

    const labelText = document.createElement('span');
    labelText.className = 'label-text';
    labelText.textContent = 'Password';

    const required = document.createElement('span');
    required.className = 'text-error ml-1';
    required.setAttribute('aria-label', 'required');
    required.textContent = '*';

    labelText.appendChild(required);
    label.appendChild(labelText);

    const field = createPasswordField({ placeholder: 'Enter your password' });

    container.appendChild(label);
    container.appendChild(field);

    return container;
  },
};
