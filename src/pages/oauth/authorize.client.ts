/**
 * OAuth consent page client script
 *
 * Better Auth's `/oauth2/consent` takes JSON (`accept` is a boolean) plus the
 * signed authorize query as `oauth_query`, and answers with `{ url }` to
 * navigate to instead of an HTTP redirect.
 */

import { onPageReady } from '@/lib/page-lifecycle.client';

interface ConsentResponse {
  url?: string;
  error_description?: string;
  message?: string;
}

function showConsentError(root: HTMLElement, message: string): void {
  const errorBox = root.querySelector<HTMLElement>('[data-consent-error]');
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function setButtonsDisabled(root: HTMLElement, disabled: boolean): void {
  root.querySelectorAll<HTMLButtonElement>('[data-consent-accept]').forEach((button) => {
    button.disabled = disabled;
  });
}

async function submitConsent(root: HTMLElement, accept: boolean): Promise<void> {
  const oauthQuery = root.dataset.oauthQuery;
  if (!oauthQuery) {
    showConsentError(root, 'This authorization request is invalid. Start again from Security.');
    return;
  }

  setButtonsDisabled(root, true);

  try {
    const response = await fetch('/api/auth/oauth2/consent', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept, oauth_query: oauthQuery }),
    });
    const data = (await response.json().catch(() => ({}))) as ConsentResponse;

    if (!response.ok || !data.url) {
      showConsentError(
        root,
        data.error_description || data.message || 'Authorization failed. Start again from Security.'
      );
      setButtonsDisabled(root, false);
      return;
    }

    window.location.href = data.url;
  } catch {
    showConsentError(root, 'Network error during authorization. Try again.');
    setButtonsDisabled(root, false);
  }
}

function initConsentPage(signal: AbortSignal): void {
  const root = document.querySelector<HTMLElement>('[data-oauth-consent]');
  if (!root) return;

  root.querySelectorAll<HTMLButtonElement>('[data-consent-accept]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        void submitConsent(root, button.dataset.consentAccept === 'true');
      },
      { signal }
    );
  });
}

onPageReady(initConsentPage);
