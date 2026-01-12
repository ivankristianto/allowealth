import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/AuthValidationMessages',
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: [
        'email-format',
        'password-mismatch',
        'password-requirements',
        'email-exists',
        'invalid-credentials',
        'network-error',
        'success',
      ],
      description: 'Type of validation message',
    },
    message: {
      control: 'text',
      description: 'Custom message to display',
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether the message can be dismissed',
    },
  },
};

export default meta;

type Story = StoryObj;

const createAuthValidationMessage = (args: {
  type?: string;
  message?: string;
  dismissible?: boolean;
}): HTMLElement => {
  const { type = 'success', message, dismissible = false } = args;

  const alert = document.createElement('div');
  alert.className = 'alert';

  // Add alert type class
  const alertTypeClasses: Record<string, string> = {
    'email-format': 'alert-warning',
    'password-mismatch': 'alert-error',
    'password-requirements': 'alert-info',
    'email-exists': 'alert-warning',
    'invalid-credentials': 'alert-error',
    'network-error': 'alert-error',
    success: 'alert-success',
  };

  alert.classList.add(alertTypeClasses[type] || 'alert-success');

  // Add content
  const alertContent = document.createElement('div');
  alertContent.className = 'flex items-start gap-3';

  // Add icon
  const iconHtml: Record<string, string> = {
    'email-format':
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
    'password-mismatch':
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    'password-requirements':
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    'email-exists':
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
    'invalid-credentials':
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    'network-error':
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    success:
      '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  };

  const iconContainer = document.createElement('div');
  iconContainer.className = 'flex-shrink-0';
  iconContainer.innerHTML = iconHtml[type as keyof typeof iconHtml] || iconHtml.success;

  alertContent.appendChild(iconContainer);

  // Add message
  const messageContainer = document.createElement('div');
  const defaultMessage: Record<string, string> = {
    'email-format': 'Please enter a valid email address',
    'password-mismatch': 'Passwords do not match',
    'password-requirements':
      'Password must be at least 12 characters with uppercase, lowercase, number, and special character',
    'email-exists': 'An account with this email already exists',
    'invalid-credentials': 'Invalid email or password',
    'network-error': 'Network error. Please check your connection and try again.',
    success: 'Operation successful!',
  };

  const messageText = message || defaultMessage[type] || '';

  if (dismissible) {
    messageContainer.innerHTML = `
      <div class="alert-content">
        ${messageText}
      </div>
      <button class="btn btn-ghost btn-sm ml-4" onclick="this.parentElement.parentElement.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;
  } else {
    messageContainer.className = 'alert-content';
    messageContainer.textContent = messageText;
  }

  alertContent.appendChild(messageContainer);
  alert.appendChild(alertContent);

  return alert;
};

export const EmailFormatError: Story = {
  args: {
    type: 'email-format',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const PasswordMismatch: Story = {
  args: {
    type: 'password-mismatch',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const PasswordRequirements: Story = {
  args: {
    type: 'password-requirements',
    message:
      'Password must be at least 12 characters with uppercase, lowercase, number, and special character',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const EmailExists: Story = {
  args: {
    type: 'email-exists',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const InvalidCredentials: Story = {
  args: {
    type: 'invalid-credentials',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const NetworkError: Story = {
  args: {
    type: 'network-error',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Account created successfully! Redirecting to login...',
  },
  render: (args) => createAuthValidationMessage(args),
};

export const DismissibleWarning: Story = {
  args: {
    type: 'email-format',
    dismissible: true,
  },
  render: (args) => createAuthValidationMessage(args),
};

export const CustomMessage: Story = {
  args: {
    type: 'success',
    message: 'Welcome back! You have been logged in successfully.',
  },
  render: (args) => createAuthValidationMessage(args),
};
