/**
 * Signup page form: validates with the shared RegistrationValidation global
 * (public/scripts/registration-validation.js) and signs up via better-auth.
 */
import { authClient } from '@/lib/auth/client';
import {
  buildCaptchaHeaders,
  hasCaptchaWidget,
  resetCaptchaWidget,
} from '@/lib/auth/captcha-client';
import { onPageReady } from '@/lib/page-lifecycle.client';

// Extra body fields read by the user-create hook in auth.service.ts; not in better-auth's client type
type SignUpRequest = Parameters<typeof authClient.signUp.email>[0] & {
  invitationToken: string;
  workspaceName?: string;
};

function initSignupForm() {
  const form = document.querySelector<HTMLFormElement>('[data-signup-form]');
  const messagesContainer = document.getElementById('form-messages');
  const submitButton = form?.querySelector<HTMLButtonElement>('[data-submit-button]');
  const buttonText = submitButton?.querySelector('[data-button-text]');
  const loadingSpinner = submitButton?.querySelector('[data-loading-spinner]');

  if (!form || !messagesContainer) return;

  // Get values from data attributes
  const invitationToken = form.getAttribute('data-invitation-token') || '';

  // Password toggle for confirm-password is handled by PasswordField's
  // inline script (binds to all [data-toggle-password] buttons globally)

  // Clear messages on input
  const inputs = form.querySelectorAll('input');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }
    });
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous messages
    messagesContainer.innerHTML = '';

    const formData = new FormData(form);
    const readField = (name: string) => String(formData.get(name) ?? '');
    const data = {
      name: readField('name'),
      email: readField('email'),
      password: readField('password'),
      'confirm-password': readField('confirm-password'),
    };

    // Use shared validation from RegistrationValidation module
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const validationResult = window.RegistrationValidation.validateRegistrationForm(
      data,
      emailInput
    );

    // Display validation errors
    if (!validationResult.isValid) {
      messagesContainer.innerHTML = window.RegistrationValidation.renderValidationErrors(
        validationResult.errors
      );
      return;
    }

    const captchaHeaders = buildCaptchaHeaders(form);
    if (hasCaptchaWidget(form) && !captchaHeaders['x-captcha-response']) {
      messagesContainer.innerHTML = window.RegistrationValidation.renderValidationErrors([
        'Please complete the bot protection check',
      ]);
      return;
    }

    // Show loading state
    form.classList.add('submitting');
    if (buttonText) buttonText.classList.add('hidden');
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    if (submitButton) submitButton.disabled = true;

    try {
      const workspaceName = readField('workspaceName').trim();
      const signUpRequest: SignUpRequest = {
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: '/dashboard',
        invitationToken,
        workspaceName: workspaceName.length > 0 ? workspaceName : undefined,
        fetchOptions: {
          headers: captchaHeaders,
        },
      };
      const result = await authClient.signUp.email(signUpRequest);

      if (!result.error) {
        messagesContainer.innerHTML = `
          <div role="alert" class="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            <span>Account created successfully! Redirecting to login...</span>
          </div>
        `;

        form.reset();

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        messagesContainer.innerHTML = `
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m15 9-6 6"></path>
              <path d="m9 9 6 6"></path>
            </svg>
            <span>${window.RegistrationValidation.escapeHtml(result.error.message || 'Registration failed. Please try again.')}</span>
          </div>
        `;
      }
    } catch (error) {
      console.error('Registration error:', error);
      messagesContainer.innerHTML = `
        <div role="alert" class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m15 9-6 6"></path>
            <path d="m9 9 6 6"></path>
          </svg>
          <span>An error occurred. Please try again.</span>
        </div>
      `;
    } finally {
      // Reset loading state
      form.classList.remove('submitting');
      if (buttonText) buttonText.classList.remove('hidden');
      if (loadingSpinner) loadingSpinner.classList.add('hidden');
      if (submitButton) submitButton.disabled = false;
      resetCaptchaWidget();
    }
  });
}

onPageReady(initSignupForm);
