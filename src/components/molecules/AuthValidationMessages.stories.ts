import type { Meta, StoryObj } from '@storybook/html';
import { AuthValidationMessages } from './AuthValidationMessages.astro';

const meta: Meta = {
	title: 'Molecules/AuthValidationMessages',
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const EmailFormatError: Story = {
	args: {
		type: 'email-format',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const PasswordMismatch: Story = {
	args: {
		type: 'password-mismatch',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const PasswordRequirements: Story = {
	args: {
		type: 'password-requirements',
		message: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const EmailExists: Story = {
	args: {
		type: 'email-exists',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const InvalidCredentials: Story = {
	args: {
		type: 'invalid-credentials',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const NetworkError: Story = {
	args: {
		type: 'network-error',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const Success: Story = {
	args: {
		type: 'success',
		message: 'Account created successfully! Redirecting to login...',
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const DismissibleWarning: Story = {
	args: {
		type: 'email-format',
		dismissible: true,
	},
	render: (args) => AuthValidationMessages.render(args),
};

export const CustomMessage: Story = {
	args: {
		type: 'success',
		message: 'Welcome back! You have been logged in successfully.',
	},
	render: (args) => AuthValidationMessages.render(args),
};
