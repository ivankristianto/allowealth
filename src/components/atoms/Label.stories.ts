import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Label',
  tags: ['autodocs'],
};

export default meta;

const createLabel = (args: {
  text?: string;
  required?: boolean;
  helpText?: string;
  inputId?: string;
}): HTMLElement => {
  const { text = 'Label', required = false, helpText = '', inputId = 'input' } = args;

  const label = document.createElement('label');
  label.className = 'label';
  label.htmlFor = inputId;

  const labelText = document.createElement('span');
  labelText.className = 'label-text';
  labelText.textContent = text;

  if (required) {
    const asterisk = document.createElement('span');
    asterisk.className = 'text-error ml-1';
    asterisk.textContent = '*';
    asterisk.setAttribute('aria-label', 'required');
    labelText.appendChild(asterisk);
  }

  label.appendChild(labelText);

  if (helpText) {
    const helpSpan = document.createElement('span');
    helpSpan.className = 'label-text-alt text-neutral-500';
    helpSpan.textContent = helpText;
    label.appendChild(helpSpan);
  }

  return label;
};

export const Default: StoryObj = {
  args: {
    text: 'Email Address',
  },
  render: (args) => createLabel(args),
};

export const Required: StoryObj = {
  args: {
    text: 'Password',
    required: true,
  },
  render: (args) => createLabel(args),
};

export const WithHelpText: StoryObj = {
  args: {
    text: 'Monthly Budget',
    helpText: 'Set your spending limit for the month',
  },
  render: (args) => createLabel(args),
};

export const RequiredWithHelp: StoryObj = {
  args: {
    text: 'Currency',
    required: true,
    helpText: 'Select your primary currency',
  },
  render: (args) => createLabel(args),
};

export const WithInput: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'form-control';

    const label = createLabel({
      text: 'Email Address',
      required: true,
      helpText: "We'll never share your email",
      inputId: 'email-input',
    });

    const input = document.createElement('input');
    input.type = 'email';
    input.id = 'email-input';
    input.placeholder = 'you@example.com';
    input.className = 'input input-bordered w-full';

    container.appendChild(label);
    container.appendChild(input);

    return container;
  },
};
