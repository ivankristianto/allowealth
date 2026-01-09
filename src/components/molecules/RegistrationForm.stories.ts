import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
	title: 'Molecules/RegistrationForm',
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

const createRegistrationForm = (args: {
	action?: string;
	method?: string;
	submitText?: string;
	loginLink?: string;
}): HTMLElement => {
	const { action = '/api/auth/register', method = 'POST', submitText = 'Create Account', loginLink = '/login' } = args;

	const container = document.createElement('div');
	container.style.maxWidth = '400px';
	container.style.margin = '0 auto';

	const form = document.createElement('form');
	form.id = 'registration-form';
	form.className = 'space-y-6';
	form.action = action;
	form.method = method;
	form.setAttribute('data-registration-form', '');
	form.noValidate = true;

	// Messages container
	const messagesDiv = document.createElement('div');
	messagesDiv.id = 'form-messages';
	messagesDiv.className = 'space-y-2';
	messagesDiv.setAttribute('aria-live', 'polite');
	messagesDiv.setAttribute('aria-atomic', 'true');
	form.appendChild(messagesDiv);

	// Name field
	const nameControl = createFormField('name', 'text', 'Full Name', 'Enter your full name', true, 'name');
	form.appendChild(nameControl);

	// Email field
	const emailControl = createFormField('email', 'email', 'Email Address', 'your.email@example.com', true, 'email');
	form.appendChild(emailControl);

	// Password field with strength
	const passwordControl = createPasswordFieldWithStrength('password', 'password', 'Password', 'Create a strong password', true);
	form.appendChild(passwordControl);

	// Confirm password field
	const confirmControl = createFormField('confirm-password', 'password', 'Confirm Password', 'Re-enter your password', true, 'new-password', true);
	form.appendChild(confirmControl);

	// Submit button
	const submitButton = document.createElement('button');
	submitButton.type = 'submit';
	submitButton.className = 'btn btn-primary w-full';
	submitButton.setAttribute('data-submit-button', '');

	const buttonText = document.createElement('span');
	buttonText.setAttribute('data-button-text', '');
	buttonText.textContent = submitText;

	const loadingSpinner = document.createElement('span');
	loadingSpinner.setAttribute('data-loading-spinner', '');
	loadingSpinner.className = 'hidden';
	loadingSpinner.innerHTML = '<span class="loading loading-spinner"></span> Creating account...';

	submitButton.appendChild(buttonText);
	submitButton.appendChild(loadingSpinner);
	form.appendChild(submitButton);

	// Login link
	const loginDiv = document.createElement('div');
	loginDiv.className = 'text-center text-sm';
	loginDiv.innerHTML = `<span class="text-base-content/60">Already have an account?</span><a href="${loginLink}" class="link link-primary ml-1">Sign in</a>`;
	form.appendChild(loginDiv);

	container.appendChild(form);

	// Add form validation script
	addFormValidation(form, loginLink);

	return container;
};

function createFormField(
	id: string,
	type: string,
	label: string,
	placeholder: string,
	required: boolean,
	autocomplete: string,
	withToggle = false
): HTMLElement {
	const container = document.createElement('div');
	container.className = 'form-control';

	const labelEl = document.createElement('label');
	labelEl.className = 'label';
	labelEl.htmlFor = id;

	const labelText = document.createElement('span');
	labelText.className = 'label-text';
	labelText.textContent = label;

	if (required) {
		const requiredSpan = document.createElement('span');
		requiredSpan.className = 'text-error ml-1';
		requiredSpan.setAttribute('aria-label', 'required');
		requiredSpan.textContent = '*';
		labelText.appendChild(requiredSpan);
	}

	labelEl.appendChild(labelText);
	container.appendChild(labelEl);

	if (withToggle) {
		const wrapper = document.createElement('div');
		wrapper.className = 'relative';

		const input = document.createElement('input');
		input.type = type;
		input.id = id;
		input.name = id;
		input.placeholder = placeholder;
		input.required = required;
		input.autocomplete = autocomplete;
		input.className = 'input input-bordered w-full pr-12';

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-circle btn-sm';
		button.setAttribute('aria-label', 'Toggle password visibility');
		button.setAttribute('data-toggle-password', id);
		button.tabIndex = -1;

		button.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" data-eye-icon>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" data-eye-off-icon>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
			</svg>
		`;

		button.addEventListener('click', () => {
			const isPassword = input.type === 'password';
			input.type = isPassword ? 'text' : 'password';
			button.querySelector('[data-eye-icon]')?.classList.toggle('hidden', !isPassword);
			button.querySelector('[data-eye-off-icon]')?.classList.toggle('hidden', isPassword);
			button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
		});

		wrapper.appendChild(input);
		wrapper.appendChild(button);
		container.appendChild(wrapper);
	} else {
		const input = document.createElement('input');
		input.type = type;
		input.id = id;
		input.name = id;
		input.placeholder = placeholder;
		input.required = required;
		input.autocomplete = autocomplete;
		input.className = 'input input-bordered w-full';
		container.appendChild(input);
	}

	return container;
}

function createPasswordFieldWithStrength(
	id: string,
	name: string,
	label: string,
	placeholder: string,
	required: boolean
): HTMLElement {
	const container = document.createElement('div');
	container.className = 'form-control';

	const labelEl = document.createElement('label');
	labelEl.className = 'label';
	labelEl.htmlFor = id;

	const labelText = document.createElement('span');
	labelText.className = 'label-text';
	labelText.textContent = label;

	if (required) {
		const requiredSpan = document.createElement('span');
		requiredSpan.className = 'text-error ml-1';
		requiredSpan.setAttribute('aria-label', 'required');
		requiredSpan.textContent = '*';
		labelText.appendChild(requiredSpan);
	}

	labelEl.appendChild(labelText);
	container.appendChild(labelEl);

	const wrapper = document.createElement('div');
	wrapper.className = 'relative';

	const input = document.createElement('input');
	input.id = id;
	input.name = name;
	input.type = 'password';
	input.placeholder = placeholder;
	input.required = required;
	input.className = 'input input-bordered w-full pr-12';
	input.setAttribute('data-password-input', '');

	wrapper.appendChild(input);
	container.appendChild(wrapper);

	// Strength meter
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

	// Requirements
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
		checkIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />';

		const xIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		xIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		xIcon.setAttribute('fill', 'none');
		xIcon.setAttribute('viewBox', '0 0 24 24');
		xIcon.setAttribute('stroke', 'currentColor');
		xIcon.classList.add('h-4', 'w-4');
		xIcon.setAttribute('data-x-icon', '');
		xIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';

		const span = document.createElement('span');
		span.textContent = text;

		li.appendChild(checkIcon);
		li.appendChild(xIcon);
		li.appendChild(span);
		requirementsList.appendChild(li);
	});

	container.appendChild(requirementsList);

	// Add validation
	input.addEventListener('input', () => {
		const password = input.value;
		const checks = {
			length: password.length >= 12,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /[0-9]/.test(password),
			special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
		};

		// Update requirements
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

		// Update strength
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

	return container;
}

function addFormValidation(form: HTMLFormElement, loginLink: string) {
	const messagesContainer = document.getElementById('form-messages');
	const submitButton = form.querySelector('[data-submit-button]') as HTMLButtonElement;
	const buttonText = submitButton?.querySelector('[data-button-text]');
	const loadingSpinner = submitButton?.querySelector('[data-loading-spinner]');

	// Clear messages on input
	form.querySelectorAll('input').forEach(input => {
		input.addEventListener('input', () => {
			messagesContainer && (messagesContainer.innerHTML = '');
		});
	});

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (messagesContainer) messagesContainer.innerHTML = '';

		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());
		const errors: string[] = [];

		// Validate name
		if (!data.name || (data.name as string).trim().length < 2) {
			errors.push('Name must be at least 2 characters');
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!data.email || !emailRegex.test(data.email as string)) {
			errors.push('Please enter a valid email address');
		}

		// Validate password requirements
		const password = data.password as string;
		const passwordErrors = [];
		if (password.length < 12) passwordErrors.push('at least 12 characters');
		if (!/[A-Z]/.test(password)) passwordErrors.push('one uppercase letter');
		if (!/[a-z]/.test(password)) passwordErrors.push('one lowercase letter');
		if (!/[0-9]/.test(password)) passwordErrors.push('one number');
		if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) passwordErrors.push('one special character');

		if (passwordErrors.length > 0) {
			errors.push(`Password must include ${passwordErrors.join(', ')}`);
		}

		// Validate password match
		if (password !== (data['confirm-password'] as string)) {
			errors.push('Passwords do not match');
		}

		if (errors.length > 0) {
			if (messagesContainer) {
				messagesContainer.innerHTML = `
					<div role="alert" class="alert alert-error">
						<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div>
							<h3 class="font-bold">Please fix the following errors:</h3>
							<ul class="text-xs mt-1 list-disc list-inside">
								${errors.map(err => `<li>${err}</li>`).join('')}
							</ul>
						</div>
					</div>
				`;
			}
			return;
		}

		// Show loading
		form.classList.add('submitting');
		buttonText?.classList.add('hidden');
		loadingSpinner?.classList.remove('hidden');
		if (submitButton) submitButton.disabled = true;

		try {
			await new Promise(resolve => setTimeout(resolve, 2000));

			if (messagesContainer) {
				messagesContainer.innerHTML = `
					<div role="alert" class="alert alert-success">
						<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Account created successfully! Redirecting to login...</span>
					</div>
				`;
			}

			form.reset();
		} catch (error) {
			if (messagesContainer) {
				messagesContainer.innerHTML = `
					<div role="alert" class="alert alert-error">
						<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>An error occurred. Please try again.</span>
					</div>
				`;
			}
		} finally {
			form.classList.remove('submitting');
			buttonText?.classList.remove('hidden');
			loadingSpinner?.classList.add('hidden');
			if (submitButton) submitButton.disabled = false;
		}
	});
}

export const Default: Story = {
	args: {},
	render: (args) => createRegistrationForm(args),
};

export const CustomSubmitText: Story = {
	args: {
		submitText: 'Sign Up',
		loginLink: '/signin',
	},
	render: (args) => createRegistrationForm(args),
};

export const EmptyState: Story = {
	args: {},
	render: (args) => createRegistrationForm(args),
	parameters: {
		docs: {
			description: {
				story: 'Form in its initial empty state with all fields blank.',
			},
		},
	},
};

export const WithValidation: Story = {
	args: {},
	render: (args) => createRegistrationForm(args),
	parameters: {
		docs: {
			description: {
				story: 'Form with client-side validation enabled. Try submitting with invalid data to see error messages.',
			},
		},
	},
};

export const PasswordValidation: Story = {
	args: {},
	render: (args) => createRegistrationForm(args),
	parameters: {
		docs: {
			description: {
				story: 'The password field includes real-time strength validation with a visual meter and requirements checklist.',
			},
		},
	},
};

export const EmailValidation: Story = {
	args: {},
	render: (args) => createRegistrationForm(args),
	parameters: {
		docs: {
			description: {
				story: 'Email field validates format on submission. Invalid email addresses will show an error message.',
			},
		},
	},
};

export const PasswordMismatch: Story = {
	args: {},
	render: (args) => createRegistrationForm(args),
	parameters: {
		docs: {
			description: {
				story: 'If the password and confirm password fields do not match, an error message is displayed on submission.',
			},
		},
	},
};
