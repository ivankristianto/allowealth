import type { Meta, StoryObj } from '@storybook/html';
import { TriangleAlert, CircleX, Lock, CircleOff, CircleCheck, X } from '@lucide/astro';

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

// Icon component mapping for each message type (matches component implementation)
const iconMap: Record<string, typeof TriangleAlert> = {
  'email-format': TriangleAlert,
  'password-mismatch': CircleX,
  'password-requirements': TriangleAlert,
  'email-exists': CircleX,
  'invalid-credentials': Lock,
  'network-error': CircleOff,
  success: CircleCheck,
};

const createAuthValidationMessage = (args: {
  type?: string;
  message?: string;
  dismissible?: boolean;
}): HTMLElement => {
  const { type = 'success', message, dismissible = false } = args;

  const alert = document.createElement('div');
  alert.className = 'alert';
  alert.setAttribute('role', 'alert');

  // Add alert type class (matches component implementation)
  const alertTypeClasses: Record<string, string> = {
    'email-format': 'alert-warning',
    'password-mismatch': 'alert-error',
    'password-requirements': 'alert-warning',
    'email-exists': 'alert-error',
    'invalid-credentials': 'alert-error',
    'network-error': 'alert-error',
    success: 'alert-success',
  };

  alert.classList.add(alertTypeClasses[type] || 'alert-success');

  // Add content
  const alertContent = document.createElement('div');
  alertContent.className = 'flex items-start gap-3';

  // Add icon using Lucide render method
  const IconComponent = iconMap[type] || CircleCheck;
  const iconContainer = document.createElement('div');
  iconContainer.className = 'flex-shrink-0';
  iconContainer.innerHTML = IconComponent.render({
    size: 24,
    class: 'shrink-0',
    'aria-hidden': 'true',
  });
  alertContent.appendChild(iconContainer);

  // Add message
  const messageContainer = document.createElement('div');
  const defaultMessage: Record<string, string> = {
    'email-format': 'Please enter a valid email address',
    'password-mismatch': 'Passwords do not match',
    'password-requirements': 'Password does not meet requirements',
    'email-exists': 'An account with this email already exists',
    'invalid-credentials': 'Invalid email or password',
    'network-error': 'Network error. Please check your connection and try again',
    success: 'Success!',
  };

  const messageText = message || defaultMessage[type] || '';

  if (dismissible) {
    messageContainer.innerHTML = `
      <div class="alert-content">
        ${messageText}
      </div>
    `;
    alertContent.appendChild(messageContainer);

    // Add dismiss button with X icon
    const dismissButton = document.createElement('button');
    dismissButton.className = 'btn btn-sm btn-circle btn-ghost';
    dismissButton.setAttribute('aria-label', 'Dismiss message');
    dismissButton.onclick = () => alert.remove();

    const xIcon = document.createElement('span');
    xIcon.innerHTML = X.render({
      size: 16,
      class: 'stroke-current',
      'aria-hidden': 'true',
    });
    dismissButton.appendChild(xIcon);

    alertContent.appendChild(dismissButton);
  } else {
    messageContainer.className = 'alert-content';
    messageContainer.textContent = messageText;
    alertContent.appendChild(messageContainer);
  }

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
