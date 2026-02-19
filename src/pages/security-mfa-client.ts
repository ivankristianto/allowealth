import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';

function promptForCode(message: string): string | null {
  const code = window.prompt(message)?.trim();
  if (!code) {
    return null;
  }
  return code;
}

async function callMfaEndpoint(path: string, body: Record<string, unknown>) {
  const response = await csrfFetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Request failed');
  }

  return result;
}

function initSecurityMfaClient() {
  const card = document.querySelector<HTMLElement>('[data-mfa-card]');
  if (!card || card.dataset.mfaClientInitialized === 'true') {
    return;
  }
  card.dataset.mfaClientInitialized = 'true';

  card.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const actionElement = target.closest<HTMLElement>('[data-action]');
    const action = actionElement?.dataset.action;

    if (!action) return;

    try {
      if (action === 'enable-mfa') {
        document.dispatchEvent(new CustomEvent('mfa:open-setup'));
        return;
      }

      if (action === 'disable-mfa') {
        const code = promptForCode(
          'Enter your current authenticator code or backup code to disable MFA:'
        );
        if (!code) return;

        await callMfaEndpoint('/api/auth/mfa/disable', { code });
        addToast('MFA disabled successfully.', 'success');
        window.setTimeout(() => window.location.reload(), 300);
        return;
      }

      if (action === 'regenerate-backup-codes') {
        const code = promptForCode(
          'Enter a current 6-digit authenticator code to regenerate backup codes:'
        );
        if (!code) return;

        const result = await callMfaEndpoint('/api/auth/mfa/regenerate-backup-codes', { code });
        const backupCodes = result.data?.backupCodes;

        if (!Array.isArray(backupCodes)) {
          throw new Error('Backup codes not returned by server');
        }

        addToast('Backup codes regenerated.', 'success');
        document.dispatchEvent(
          new CustomEvent('mfa:show-backup-codes', {
            detail: { backupCodes },
          })
        );
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MFA action failed';
      addToast(message, 'error');
    }
  });

  document.addEventListener('mfa:backup-codes-modal-closed', () => {
    window.location.reload();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSecurityMfaClient);
} else {
  initSecurityMfaClient();
}

document.addEventListener('astro:page-load', initSecurityMfaClient);
