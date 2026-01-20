/**
 * Client-side script for PasswordField component
 *
 * Handles password visibility toggle, strength meter, and requirements validation
 */

import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from '@/lib/validation';

/**
 * Initialize password field functionality
 */
export function initPasswordFields() {
  // Password toggle visibility
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    // Remove existing listeners by cloning (prevents duplicate listeners)
    const newButton = button.cloneNode(true) as HTMLElement;
    button.parentNode?.replaceChild(newButton, button);

    newButton.addEventListener('click', () => {
      const targetId = newButton.getAttribute('data-toggle-password');
      if (!targetId) return;

      const input = document.getElementById(targetId);
      const eyeIcon = newButton.querySelector('[data-eye-icon]');
      const eyeOffIcon = newButton.querySelector('[data-eye-off-icon]');

      if (input && eyeIcon && eyeOffIcon) {
        const isPassword = (input as HTMLInputElement).type === 'password';
        (input as HTMLInputElement).type = isPassword ? 'text' : 'password';
        eyeIcon.classList.toggle('hidden', !isPassword);
        eyeOffIcon.classList.toggle('hidden', isPassword);
        newButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      }
    });
  });

  // Password strength and requirements
  document.querySelectorAll('[data-password-input]').forEach((input) => {
    const showStrength = input.getAttribute('data-show-strength') === 'true';
    const showRequirements = input.getAttribute('data-show-requirements') === 'true';

    if (!showStrength && !showRequirements) return;

    const requirementsId = input.getAttribute('data-requirements-id');
    const strengthMeterId = input.getAttribute('data-strength-meter-id');
    const requirementsList = requirementsId ? document.getElementById(requirementsId) : null;
    const strengthMeter = strengthMeterId ? document.getElementById(strengthMeterId) : null;

    if (!requirementsList && !strengthMeter) return;

    // Remove existing listener by cloning
    const newInput = input.cloneNode(true) as HTMLInputElement;
    input.parentNode?.replaceChild(newInput, input);

    newInput.addEventListener('input', () => {
      try {
        const password = newInput.value;

        // Check requirements (matching server-side validation)
        const checks = {
          length: password.length >= PASSWORD_MIN_LENGTH,
          letter: PASSWORD_REQUIREMENTS.hasLetter.test(password),
          numberOrSpecial: PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(password),
        };

        // Update requirements list
        if (requirementsList) {
          Object.entries(checks).forEach(([key, passed]) => {
            const item = requirementsList.querySelector(`[data-requirement="${key}"]`);
            if (item) {
              const checkIcon = item.querySelector('[data-check-icon]');
              const xIcon = item.querySelector('[data-x-icon]');

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
        }

        // Calculate and update strength (3 requirements total)
        if (strengthMeter) {
          const passedCount = Object.values(checks).filter(Boolean).length;
          const strengthLabel = strengthMeter.querySelector('[data-strength-label]');
          const bars = strengthMeter.querySelectorAll('[data-strength-bar]');

          // Check if bars exist before manipulating
          if (!bars || bars.length === 0) return;

          let strength = 'weak';
          let colorClass = 'bg-error';

          // Handle empty password first
          if (password.length === 0) {
            strength = 'Not entered';
            colorClass = 'bg-base-300';
          } else if (passedCount === 1) {
            strength = 'Weak';
            colorClass = 'bg-error';
          } else if (passedCount === 2) {
            strength = 'Medium';
            colorClass = 'bg-warning';
          } else {
            strength = 'Strong';
            colorClass = 'bg-success';
          }

          if (strengthLabel) {
            strengthLabel.textContent = strength;
          }

          // Update strength bars (scale 3 requirements to 4 bars)
          // 1 requirement = 1 bar, 2 requirements = 3 bars, 3 requirements = 4 bars
          bars.forEach((bar, index) => {
            bar.classList.remove(
              'bg-error',
              'bg-warning',
              'bg-success',
              'bg-base-300',
              'opacity-30'
            );

            if (password.length === 0) {
              bar.classList.add('bg-base-300');
            } else {
              // Scale 3 requirements to 4 visual bars
              const barsToFill = passedCount === 1 ? 1 : passedCount === 2 ? 3 : 4;

              if (index < barsToFill) {
                bar.classList.add(colorClass);
              } else {
                bar.classList.add('bg-base-300');
              }
            }
          });
        }
      } catch (error) {
        console.error('Password strength calculation error:', error);
      }
    });
  });
}

// Initialize on DOM load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordFields);
  } else {
    // DOM already loaded
    initPasswordFields();
  }
}
