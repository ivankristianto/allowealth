/**
 * Installer page client script
 *
 * Handles form submission, password confirmation, and error display.
 */

let controller: AbortController | null = null;

function showError(message: string): void {
  const errorContainer = document.getElementById('installer-error');
  if (!errorContainer) return;
  errorContainer.textContent = '';
  const alert = document.createElement('div');
  alert.className = 'alert alert-error mb-4';
  const span = document.createElement('span');
  span.textContent = message;
  alert.appendChild(span);
  errorContainer.appendChild(alert);
}

function clearError(): void {
  const errorContainer = document.getElementById('installer-error');
  if (!errorContainer) return;
  errorContainer.textContent = '';
}

async function handleSubmit(e: Event): Promise<void> {
  e.preventDefault();
  clearError();

  const form = e.target as HTMLFormElement;
  const submitBtn = document.getElementById('installer-submit') as HTMLButtonElement | null;
  const formData = new FormData(form);
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
  }

  try {
    const response = await fetch('/api/installer/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceName: formData.get('workspaceName'),
        name: formData.get('name'),
        email: formData.get('email'),
        password,
        installerSecret: formData.get('installerSecret'),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      window.location.href = '/login?installed=true';
    } else {
      showError(data.error || 'Setup failed. Please try again.');
    }
  } catch {
    showError('Network error. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
}

function initInstallerPage(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const form = document.getElementById('installer-form');
  if (form) {
    form.addEventListener('submit', handleSubmit, { signal });
  }
}

initInstallerPage();
document.addEventListener('astro:page-load', initInstallerPage);
