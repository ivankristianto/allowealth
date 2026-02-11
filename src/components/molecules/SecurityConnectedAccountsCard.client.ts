/**
 * SecurityConnectedAccountsCard Client Script
 *
 * Handles OAuth provider unlink (disconnect) functionality.
 * Listens for form submissions on [data-unlink-form] elements,
 * sends a POST to the provider unlink endpoint, and reloads on success.
 */

import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';

function initConnectedAccounts() {
  document.querySelectorAll<HTMLFormElement>('[data-unlink-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const provider = form.dataset.provider;
      const btn = form.querySelector<HTMLButtonElement>('[data-unlink-btn]');
      if (btn) btn.disabled = true;

      try {
        const res = await csrfFetch(`/api/auth/${provider}/unlink`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json();
          addToast(data.error?.message || 'Failed to disconnect', 'error');
          if (btn) btn.disabled = false;
        }
      } catch {
        addToast('Failed to disconnect. Please try again.', 'error');
        if (btn) btn.disabled = false;
      }
    });
  });
}

initConnectedAccounts();

document.addEventListener('astro:page-load', initConnectedAccounts);
