/**
 * Security Passkeys Client Script
 *
 * Handles passkey management (list, add, delete) on the Security settings page.
 * Uses Better Auth passkey client methods.
 */

import { authClient } from '@/lib/auth/client';
import { addToast } from '@/lib/stores/toastStore';

let controller: AbortController | null = null;
let deleteController: AbortController | null = null;

function getPasskeyLabel(passkey: { name?: string | null; deviceType: string }): string {
  return passkey.name || passkey.deviceType || 'Passkey';
}

function renderPasskeyItem(passkey: {
  id: string;
  name?: string | null;
  deviceType: string;
  createdAt: Date | string;
}): HTMLElement {
  const createdAt =
    passkey.createdAt instanceof Date ? passkey.createdAt : new Date(passkey.createdAt);
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const item = document.createElement('div');
  item.className = 'flex items-center justify-between gap-4 p-4';
  item.dataset.passkeyId = passkey.id;
  item.innerHTML = `
    <div class="flex items-center gap-4">
      <div class="rounded-xl bg-base-200 p-2 text-base-content/60">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.4 2.7a2.5 2.5 0 0 1 3.4 0l5.5 5.5a2.5 2.5 0 0 1 0 3.4l-3.7 3.7a2.5 2.5 0 0 1-3.4 0L8.7 9.8a2.5 2.5 0 0 1 0-3.4z"/>
          <path d="m14 7 3 3"/>
          <path d="m9.4 10.6-6.814 6.814A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814"/>
        </svg>
      </div>
      <div>
        <p class="text-sm font-semibold">${escapeHtml(getPasskeyLabel(passkey))}</p>
        <p class="text-xs text-base-content/60">Added on ${escapeHtml(formattedDate)}</p>
      </div>
    </div>
    <button
      type="button"
      class="btn btn-ghost btn-sm rounded-xl text-error"
      aria-label="Remove passkey"
      data-action="delete-passkey"
      data-passkey-id="${escapeHtml(passkey.id)}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </svg>
    </button>
  `;
  return item;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isCancellationError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('cancel') || lower.includes('abort') || lower.includes('not allowed');
}

async function refreshPasskeyList(signal?: AbortSignal) {
  const list = document.getElementById('passkeys-list');
  if (!list) return;

  try {
    const result = await authClient.passkey.listUserPasskeys();
    if (result.error) {
      return;
    }

    const passkeys = result.data ?? [];
    list.replaceChildren();

    if (passkeys.length === 0) {
      const empty = document.createElement('p');
      empty.id = 'passkeys-empty';
      empty.className = 'p-4 text-sm text-base-content/50 text-center';
      empty.textContent = 'No passkeys registered yet.';
      list.appendChild(empty);
    } else {
      passkeys.forEach((pk) => {
        list.appendChild(renderPasskeyItem(pk));
      });
      // Re-attach delete listeners to newly rendered buttons
      if (signal) {
        attachDeleteListeners(list, signal);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (!isCancellationError(msg)) {
      addToast('Failed to load passkeys. Please refresh the page.', 'error');
    }
  }
}

function attachDeleteListeners(container: Element, signal: AbortSignal) {
  const modal = document.getElementById('delete-passkey-modal') as HTMLDialogElement | null;
  const confirmBtn = document.querySelector<HTMLButtonElement>('[data-confirm-delete-passkey]');

  container.querySelectorAll<HTMLButtonElement>('[data-action="delete-passkey"]').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const id = btn.dataset.passkeyId;
        if (!id || !modal || !confirmBtn) return;

        // Abort previous delete controller to avoid duplicate listeners
        deleteController?.abort();
        deleteController = new AbortController();

        confirmBtn.dataset.deletingPasskeyId = id;
        modal.showModal();

        // Attach confirmation listener with its own AbortController
        confirmBtn.addEventListener(
          'click',
          async () => {
            const passkeyId = confirmBtn.dataset.deletingPasskeyId;
            if (!passkeyId) return;

            modal.close();
            confirmBtn.disabled = true;

            try {
              const result = await authClient.passkey.deletePasskey({ id: passkeyId });
              if (result.error) {
                addToast(result.error.message || 'Failed to remove passkey', 'error');
                confirmBtn.disabled = false;
                return;
              }
              addToast('Passkey removed', 'success');
              await refreshPasskeyList(signal);
            } catch {
              addToast('Failed to remove passkey. Please try again.', 'error');
              confirmBtn.disabled = false;
            }
          },
          { once: true, signal: deleteController.signal }
        );
      },
      { signal }
    );
  });
}

function initSecurityPasskeys() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const addBtn = document.getElementById('add-passkey-btn');
  if (!addBtn) return;

  addBtn.addEventListener(
    'click',
    async () => {
      (addBtn as HTMLButtonElement).disabled = true;
      try {
        const result = await authClient.passkey.addPasskey();
        if (result?.error) {
          const msg = result.error.message || '';
          if (isCancellationError(msg)) {
            addToast('Registration cancelled', 'info');
          } else {
            addToast(msg || 'Failed to register passkey', 'error');
          }
          return;
        }
        addToast('Passkey registered successfully', 'success');
        await refreshPasskeyList(signal);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (isCancellationError(msg)) {
          addToast('Registration cancelled', 'info');
        } else {
          addToast("This device doesn't support passkeys or registration was cancelled", 'error');
        }
      } finally {
        (addBtn as HTMLButtonElement).disabled = false;
      }
    },
    { signal }
  );

  // Attach delete listeners to server-rendered passkey items
  const list = document.getElementById('passkeys-list');
  if (list) {
    attachDeleteListeners(list, signal);
  }
}

initSecurityPasskeys();

document.addEventListener('astro:page-load', initSecurityPasskeys);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  deleteController?.abort();
});
