import { authClient } from '@/lib/auth/client';
import { logSecurityActivity } from '@/lib/security-activity.client';
import { addToast } from '@/lib/stores/toastStore';

function requestPassword(
  title: string,
  description: string,
  confirmLabel?: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const handler = (event: Event) => {
      document.removeEventListener('mfa:confirm-result', handler);
      const detail = (event as CustomEvent).detail;
      resolve(detail?.password || null);
    };
    document.addEventListener('mfa:confirm-result', handler);
    document.dispatchEvent(
      new CustomEvent('mfa:open-confirm', {
        detail: { title, description, confirmLabel },
      })
    );
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
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
        const password = await requestPassword(
          'Disable MFA',
          'Enter your account password to disable multi-factor authentication.',
          'Disable MFA'
        );
        if (!password) return;

        const result = await authClient.twoFactor.disable({ password });
        if (result.error) {
          throw result.error;
        }
        await logSecurityActivity({ type: 'mfa_disabled' });

        addToast('MFA disabled successfully.', 'success');
        window.setTimeout(() => window.location.reload(), 300);
        return;
      }

      if (action === 'regenerate-backup-codes') {
        const password = await requestPassword(
          'Regenerate Backup Codes',
          'Enter your account password to regenerate your backup codes.',
          'Regenerate'
        );
        if (!password) return;

        const result = await authClient.twoFactor.generateBackupCodes({ password });
        if (result.error) {
          throw result.error;
        }

        const backupCodes = result.data?.backupCodes;

        if (!Array.isArray(backupCodes)) {
          throw new Error('Backup codes not returned by server');
        }
        await logSecurityActivity({ type: 'mfa_backup_codes_regenerated' });

        addToast('Backup codes regenerated.', 'success');
        document.dispatchEvent(
          new CustomEvent('mfa:show-backup-codes', {
            detail: { backupCodes },
          })
        );
        return;
      }
    } catch (error) {
      const message = getErrorMessage(error, 'MFA action failed');
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
