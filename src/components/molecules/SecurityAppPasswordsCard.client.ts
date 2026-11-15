import { addToast } from '@/lib/stores/toastStore';
import { csrfFetch } from '@/lib/csrf-client';
import { setButtonLoading } from '@/lib/client-utils';
import { replaceWithSanitizedHtml } from '@/lib/dom/sanitize-fragment';
import { onPageReady } from '@/lib/page-lifecycle.client';
import { readAccessFields, syncCustomPermissions } from './AppPasswordAccessFields.client';
import { readLimitFields, syncCategoryLimit } from './AppPasswordLimitFields.client';

const ENDPOINT = '/api/user/app-passwords';

interface ApiErrorBody {
  error?: { message?: string; code?: string; details?: Array<{ message?: string }> };
}

function getApiErrorMessage(body: ApiErrorBody | null, fallback: string): string {
  return body?.error?.details?.[0]?.message || body?.error?.message || fallback;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function refreshList(container: HTMLElement): Promise<void> {
  const response = await csrfFetch(`${ENDPOINT}?_render=html`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to refresh app passwords');
  replaceWithSanitizedHtml(container, await response.text());
}

async function signInAgain(): Promise<void> {
  const { authClient } = await import('@/lib/auth/client');
  await authClient.signOut({});
  window.location.href = `/login?redirect=${encodeURIComponent('/security')}`;
}

function initAppPasswordsCard(signal: AbortSignal): void {
  const card = document.querySelector<HTMLElement>('[data-app-passwords-card]');
  if (!card) return;

  const list = card.querySelector<HTMLElement>('[data-app-passwords-list]');
  const reveal = card.querySelector<HTMLElement>('[data-app-password-reveal]');
  const revealValue = card.querySelector<HTMLInputElement>('[data-app-password-value]');
  const createModal = card.querySelector<HTMLDialogElement>('[data-create-app-password-modal]');
  const createForm = card.querySelector<HTMLFormElement>('[data-create-app-password-form]');
  const editModal = card.querySelector<HTMLDialogElement>('[data-edit-app-password-modal]');
  const editBody = card.querySelector<HTMLElement>('[data-edit-app-password-body]');
  const revokeModal = card.querySelector<HTMLDialogElement>('[data-revoke-app-password-modal]');
  const revokeLabel = card.querySelector<HTMLElement>('[data-revoke-app-password-label]');
  const confirmRevoke = card.querySelector<HTMLButtonElement>('[data-confirm-revoke-app-password]');
  if (
    !list ||
    !reveal ||
    !revealValue ||
    !createModal ||
    !editModal ||
    !editBody ||
    !revokeModal ||
    !confirmRevoke
  ) {
    return;
  }

  let pendingRevokeId: string | null = null;

  function hideReveal(): void {
    revealValue!.value = '';
    reveal!.hidden = true;
    delete reveal!.dataset.appPasswordId;
  }

  card.addEventListener(
    'click',
    async (event) => {
      const target = event.target as HTMLElement;

      if (target.closest('[data-open-create-app-password]')) {
        if (createForm) {
          createForm.reset();
          syncCustomPermissions(createForm);
          syncCategoryLimit(createForm);
        }
        createModal.showModal();
        createForm?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
        return;
      }

      if (target.closest('[data-close-app-password-dialog]')) {
        target.closest('dialog')?.close();
        return;
      }

      const editButton = target.closest<HTMLButtonElement>('[data-edit-app-password]');
      if (editButton) {
        const id = editButton.dataset.appPasswordId;
        if (!id) return;
        setButtonLoading(editButton, true);
        try {
          const response = await csrfFetch(`${ENDPOINT}/${encodeURIComponent(id)}?_render=html`, {
            credentials: 'include',
          });
          if (!response.ok) {
            const body = await readJson<ApiErrorBody>(response);
            throw new Error(getApiErrorMessage(body, 'Failed to open app password'));
          }
          replaceWithSanitizedHtml(editBody, await response.text());
          editModal.showModal();
          editBody.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
        } catch (error) {
          addToast(error instanceof Error ? error.message : 'Failed to open app password', 'error');
        } finally {
          setButtonLoading(editButton, false);
        }
        return;
      }

      const signInButton = target.closest<HTMLButtonElement>('[data-app-password-sign-in-again]');
      if (signInButton) {
        setButtonLoading(signInButton, true);
        try {
          await signInAgain();
        } catch {
          setButtonLoading(signInButton, false);
          addToast('Could not sign out. Please try again.', 'error');
        }
        return;
      }

      if (target.closest('[data-copy-app-password]')) {
        try {
          await navigator.clipboard.writeText(revealValue.value);
          addToast('App password copied', 'success');
        } catch {
          revealValue.select();
          addToast('Copy failed. Select the text and copy it manually.', 'error');
        }
        return;
      }

      const revokeButton = target.closest<HTMLButtonElement>('[data-revoke-app-password]');
      if (revokeButton) {
        pendingRevokeId = revokeButton.dataset.appPasswordId ?? null;
        if (revokeLabel) revokeLabel.textContent = revokeButton.dataset.appPasswordName ?? '';
        revokeModal.showModal();
      }
    },
    { signal }
  );

  createForm?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      const submitButton = createForm.querySelector<HTMLButtonElement>(
        '[data-submit-create-app-password]'
      );
      const formData = new FormData(createForm);
      setButtonLoading(submitButton, true);

      try {
        const response = await csrfFetch(ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.get('name'),
            expiry: formData.get('expiry'),
            ...readAccessFields(formData),
            ...readLimitFields(formData),
          }),
        });
        const body = await readJson<
          ApiErrorBody & { data?: { token: string; appPassword: { id: string } } }
        >(response);

        if (!response.ok || !body?.data) {
          throw new Error(getApiErrorMessage(body, 'Failed to create app password'));
        }

        createModal.close();
        revealValue.value = body.data.token;
        reveal.dataset.appPasswordId = body.data.appPassword.id;
        reveal.hidden = false;
        revealValue.focus();
        revealValue.select();
        addToast('App password created', 'success');
        await refreshList(list);
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Failed to create app password', 'error');
      } finally {
        setButtonLoading(submitButton, false);
      }
    },
    { signal }
  );

  card.addEventListener(
    'change',
    (event) => {
      const target = event.target as HTMLElement;
      const form = target.closest('form');
      if (!form) return;
      if (target.matches('[data-app-password-preset]')) syncCustomPermissions(form);
      if (target.matches('[data-app-password-category-limit]')) syncCategoryLimit(form);
    },
    { signal }
  );

  // The edit form is injected after load, so its submit is delegated.
  card.addEventListener(
    'submit',
    async (event) => {
      const form = (event.target as HTMLElement).closest<HTMLFormElement>(
        '[data-edit-app-password-form]'
      );
      if (!form) return;
      event.preventDefault();

      const id = form.dataset.appPasswordId;
      if (!id) return;
      const submitButton = form.querySelector<HTMLButtonElement>('[data-submit-edit-app-password]');
      const formData = new FormData(form);
      setButtonLoading(submitButton, true);

      try {
        const response = await csrfFetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.get('name'),
            ...readAccessFields(formData),
            ...readLimitFields(formData),
          }),
        });
        if (!response.ok) {
          const body = await readJson<ApiErrorBody>(response);
          throw new Error(getApiErrorMessage(body, 'Failed to update app password'));
        }

        editModal.close();
        addToast('App password updated', 'success');
        await refreshList(list);
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Failed to update app password', 'error');
      } finally {
        setButtonLoading(submitButton, false);
      }
    },
    { signal }
  );

  confirmRevoke.addEventListener(
    'click',
    async () => {
      if (!pendingRevokeId) return;
      const id = pendingRevokeId;
      setButtonLoading(confirmRevoke, true);

      try {
        const response = await csrfFetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!response.ok) {
          const body = await readJson<ApiErrorBody>(response);
          throw new Error(getApiErrorMessage(body, 'Failed to revoke app password'));
        }

        revokeModal.close();
        pendingRevokeId = null;
        if (reveal.dataset.appPasswordId === id) hideReveal();
        addToast('App password revoked', 'success');
        await refreshList(list);
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Failed to revoke app password', 'error');
      } finally {
        setButtonLoading(confirmRevoke, false);
      }
    },
    { signal }
  );
}

onPageReady(initAppPasswordsCard);
