import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Auth/Register',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
User registration page with form validation and error handling.

### Icon Specifications

#### Server-Side Icons

| Icon | Component | Size | Class | Location |
|------|-----------|------|-------|----------|
| CircleX | @lucide/astro | 24px | \`shrink-0\` | Query param error alert |

#### Client-Side Icons (Inline SVG with Lucide paths)

| Icon | Size | Class | Location |
|------|------|-------|----------|
| CircleX | h-6 w-6 (24px) | \`stroke-current shrink-0\` | Validation/registration errors |
| CircleCheck | h-6 w-6 (24px) | \`stroke-current shrink-0\` | Success message |

### Client-Side Icon Paths

#### CircleX (Error)
\`\`\`html
<circle cx="12" cy="12" r="10"></circle>
<path d="m15 9-6 6"></path>
<path d="m9 9 6 6"></path>
\`\`\`

#### CircleCheck (Success)
\`\`\`html
<circle cx="12" cy="12" r="10"></circle>
<path d="m9 12 2 2 4-4"></path>
\`\`\`

### Page Structure

| Section | Description |
|---------|-------------|
| Messages Container | \`aria-live="polite"\`, \`aria-atomic="true"\` |
| Error Alert | Server-side for query param errors |
| Registration Form | RegistrationForm molecule component |

### Query Parameter Error Codes

| Code | Message |
|------|---------|
| email_exists | Email already registered |
| weak_password | Password too weak |
| invalid_email | Invalid email format |
| invalid_input | Invalid input data |

### Form Validation

| Field | Rules |
|-------|-------|
| Name | Min 2 characters |
| Email | Valid email format (HTML5) |
| Password | Min 12 chars, uppercase, lowercase, number, special char |
| Confirm Password | Must match password |

### Password Requirements
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### API Integration
- Endpoint: POST /api/auth/signup
- Body: JSON with name, email, password
- Credentials: include (for cookies)

### Loading States
- Spinner: \`data-loading-spinner\` class
- Button text: Hidden via \`data-button-text\` + hidden class
- Submit button: Disabled during submission

### Post-Registration Flow
1. Form reset on success
2. Success message displayed
3. Redirect to /login after 2 seconds

### Security Features
- CSP nonce for inline script
- Whitelisted error codes (XSS prevention)
- HTML escaping in error messages: \`< -> &lt;\`, \`> -> &gt;\`
- No password exposure in errors

### Accessibility

| Element | ARIA |
|---------|------|
| Messages container | \`aria-live="polite"\`, \`aria-atomic="true"\` |
| Error alerts | \`role="alert"\` |
| Server-side icon | \`aria-hidden="true"\` |

### Layout Integration
- Uses AuthLayout wrapper
- Title: "Finance Manager - Sign Up"
- CSP nonce from middleware: \`Astro.locals.cspNonce\`

### Edge Cases Handled
- Missing query parameters
- Malformed error codes (ignored for security)
- Form submission before DOM ready
- Missing form element
- API timeout
- Malformed API response
        `,
      },
    },
  },
  argTypes: {
    errorCode: {
      control: 'select',
      options: ['', 'email_exists', 'weak_password', 'invalid_email', 'invalid_input'],
    },
    showValidationError: { control: 'boolean' },
    showSuccess: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;

const createRegisterPage = (args: {
  errorCode?: string;
  showValidationError?: boolean;
  showSuccess?: boolean;
  isLoading?: boolean;
}): HTMLElement => {
  const {
    errorCode = '',
    showValidationError = false,
    showSuccess = false,
    isLoading = false,
  } = args;

  const errorMessages: Record<string, string> = {
    email_exists: 'An account with this email already exists',
    weak_password: 'Password does not meet security requirements',
    invalid_email: 'Please enter a valid email address',
    invalid_input: 'Please check your input and try again',
  };

  const container = document.createElement('div');
  container.className = 'min-h-screen flex items-center justify-center bg-base-200 p-4';

  const card = document.createElement('div');
  card.className = 'card bg-base-100 shadow-xl w-full max-w-md';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  // Header
  cardBody.innerHTML = `
    <h1 class="text-2xl font-bold text-center mb-2">Create Account</h1>
    <p class="text-center text-base-content/60 mb-6">Sign up to get started with Finance Manager</p>
  `;

  // Messages Container
  const messagesContainer = document.createElement('div');
  messagesContainer.id = 'messages';
  messagesContainer.setAttribute('aria-live', 'polite');
  messagesContainer.setAttribute('aria-atomic', 'true');
  messagesContainer.className = 'mb-4';

  // Error from query param
  if (errorCode && errorMessages[errorCode]) {
    const errorAlert = document.createElement('div');
    errorAlert.className = 'alert alert-error';
    errorAlert.setAttribute('role', 'alert');
    errorAlert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="m15 9-6 6"/>
        <path d="m9 9 6 6"/>
      </svg>
      <span>${errorMessages[errorCode]}</span>
    `;
    messagesContainer.appendChild(errorAlert);
  }

  // Client-side validation error
  if (showValidationError) {
    const validationAlert = document.createElement('div');
    validationAlert.className = 'alert alert-error';
    validationAlert.setAttribute('role', 'alert');
    validationAlert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current shrink-0 h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m15 9-6 6"></path>
        <path d="m9 9 6 6"></path>
      </svg>
      <span>Password must be at least 12 characters</span>
    `;
    messagesContainer.appendChild(validationAlert);
  }

  // Success message
  if (showSuccess) {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success';
    successAlert.setAttribute('role', 'alert');
    successAlert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current shrink-0 h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m9 12 2 2 4-4"></path>
      </svg>
      <span>Account created successfully! Redirecting to login...</span>
    `;
    messagesContainer.appendChild(successAlert);
  }

  cardBody.appendChild(messagesContainer);

  // Form
  const form = document.createElement('form');
  form.className = 'space-y-4';
  form.innerHTML = `
    <div class="form-control">
      <label class="label" for="name">
        <span class="label-text">Full Name</span>
      </label>
      <input type="text" id="name" name="name" class="input input-bordered" placeholder="John Doe" required />
    </div>
    <div class="form-control">
      <label class="label" for="email">
        <span class="label-text">Email</span>
      </label>
      <input type="email" id="email" name="email" class="input input-bordered" placeholder="john@example.com" required />
    </div>
    <div class="form-control">
      <label class="label" for="password">
        <span class="label-text">Password</span>
      </label>
      <input type="password" id="password" name="password" class="input input-bordered" placeholder="Min 12 characters" required />
      <label class="label">
        <span class="label-text-alt text-base-content/50">Must include uppercase, lowercase, number, and special character</span>
      </label>
    </div>
    <div class="form-control">
      <label class="label" for="confirm-password">
        <span class="label-text">Confirm Password</span>
      </label>
      <input type="password" id="confirm-password" name="confirm-password" class="input input-bordered" placeholder="Repeat password" required />
    </div>
    <button type="submit" class="btn btn-accent w-full" ${isLoading ? 'disabled' : ''}>
      ${
        isLoading
          ? `
        <span class="loading loading-spinner loading-sm" data-loading-spinner></span>
      `
          : `
        <span data-button-text>Create Account</span>
      `
      }
    </button>
  `;
  cardBody.appendChild(form);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'text-center mt-4';
  footer.innerHTML = `
    <p class="text-sm text-base-content/60">
      Already have an account? <a href="/login" class="link link-accent">Sign in</a>
    </p>
  `;
  cardBody.appendChild(footer);

  card.appendChild(cardBody);
  container.appendChild(card);

  return container;
};

export const Default: StoryObj = {
  args: { errorCode: '', showValidationError: false, showSuccess: false, isLoading: false },
  render: (args) => createRegisterPage(args),
};

export const EmailExists: StoryObj = {
  args: {
    errorCode: 'email_exists',
    showValidationError: false,
    showSuccess: false,
    isLoading: false,
  },
  render: (args) => createRegisterPage(args),
};

export const WeakPassword: StoryObj = {
  args: {
    errorCode: 'weak_password',
    showValidationError: false,
    showSuccess: false,
    isLoading: false,
  },
  render: (args) => createRegisterPage(args),
};

export const ValidationError: StoryObj = {
  args: { errorCode: '', showValidationError: true, showSuccess: false, isLoading: false },
  render: (args) => createRegisterPage(args),
};

export const Success: StoryObj = {
  args: { errorCode: '', showValidationError: false, showSuccess: true, isLoading: false },
  render: (args) => createRegisterPage(args),
};

export const Loading: StoryObj = {
  args: { errorCode: '', showValidationError: false, showSuccess: false, isLoading: true },
  render: (args) => createRegisterPage(args),
};
