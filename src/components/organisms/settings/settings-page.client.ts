/** Settings page: tab switching, workspace settings form, invitations and the data panel. */

import { addToast } from '@/lib/stores/toastStore';
import { setButtonLoading } from '@/lib/client-utils';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { onPageReady } from '@/lib/page-lifecycle.client';

function bindSettingsTabs(container: HTMLElement, signal: AbortSignal) {
  const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-settings-tab]'));
  const panels = Array.from(container.querySelectorAll<HTMLElement>('[data-settings-panel]'));
  const defaultTab = container.getAttribute('data-active-tab') || 'general';

  const setActiveTab = (tabId: string) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === tabId;
      const activeClasses = ['bg-accent/10', 'text-accent', 'font-bold', 'border-accent/20'];
      const inactiveClasses = [
        'text-base-content/60',
        'hover:text-base-content',
        'font-medium',
        'border-transparent',
      ];

      activeClasses.forEach((className) => tab.classList.toggle(className, isActive));
      inactiveClasses.forEach((className) => tab.classList.toggle(className, !isActive));
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');

      const dot = tab.querySelector<HTMLElement>('[data-active-dot]');
      if (dot) dot.classList.toggle('hidden', !isActive);
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.tab === tabId;
      panel.classList.toggle('hidden', !isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  };

  const resolveTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return defaultTab;
    return tabs.some((tab) => tab.dataset.tab === hash) ? hash : defaultTab;
  };

  setActiveTab(resolveTabFromHash());

  tabs.forEach((tab) => {
    tab.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        const tabId = tab.dataset.tab;
        if (!tabId) return;
        setActiveTab(tabId);
        window.history.replaceState(null, '', `#${tabId}`);
      },
      { signal }
    );
  });

  window.addEventListener(
    'hashchange',
    () => {
      setActiveTab(resolveTabFromHash());
    },
    { signal }
  );
}

function initSettingsPage(signal: AbortSignal) {
  const container = document.querySelector('[data-settings-page]') as HTMLElement | null;
  if (!container) return;

  const isAdmin = container.dataset.isAdmin === 'true';

  bindSettingsTabs(container, signal);

  // ==================== WORKSPACE SETTINGS FORM ====================
  const saveBtnBottom = document.getElementById('save-settings-btn') as HTMLButtonElement | null;
  const settingsForm = document.getElementById('workspace-settings-form') as HTMLFormElement | null;
  const primaryCurrencySelect = document.getElementById(
    'primary-currency'
  ) as HTMLSelectElement | null;
  const secondaryCurrencySelect = document.getElementById(
    'secondary-currency'
  ) as HTMLSelectElement | null;

  async function handleSave() {
    const allSaveBtns = [saveBtnBottom].filter(Boolean) as HTMLButtonElement[];
    allSaveBtns.forEach((btn) => setButtonLoading(btn, true));

    try {
      const formData = new FormData(settingsForm!);
      const canEditCurrencySettings =
        !primaryCurrencySelect?.disabled && !secondaryCurrencySelect?.disabled;

      const payload: Record<string, unknown> = {
        weekStart: formData.get('weekStart'),
      };
      if (canEditCurrencySettings) {
        payload.currency = primaryCurrencySelect?.value ?? formData.get('currency');
        payload.secondaryCurrency = secondaryCurrencySelect?.value ?? '';
      }

      // Include workspace name only if admin
      if (isAdmin) {
        const workspaceName = formData.get('workspaceName');
        if (workspaceName) {
          payload.name = workspaceName;
        }
      }

      const response = await fetch('/api/workspace/settings', {
        method: 'PUT',
        headers: getCsrfHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addToast('Settings saved successfully!', 'success');
      } else {
        const errorMessage = result.error?.message || 'Failed to save settings. Please try again.';
        addToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Settings update error:', error);
      addToast('An error occurred. Please check your connection and try again.', 'error');
    } finally {
      allSaveBtns.forEach((btn) => setButtonLoading(btn, false));
    }
  }

  if (saveBtnBottom && settingsForm) {
    saveBtnBottom.addEventListener('click', handleSave);
    // Enter in a field submits the form; save via the API instead of a native submission
    settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void handleSave();
    });
  }

  if (primaryCurrencySelect && secondaryCurrencySelect) {
    const syncSecondaryCurrencyOptions = () => {
      const selectedPrimary = primaryCurrencySelect.value;
      for (const option of Array.from(secondaryCurrencySelect.options)) {
        if (option.value === '') continue;
        option.hidden = option.value === selectedPrimary;
      }
      if (secondaryCurrencySelect.value === selectedPrimary) {
        secondaryCurrencySelect.value = '';
      }
    };

    primaryCurrencySelect.addEventListener('change', syncSecondaryCurrencyOptions);
    syncSecondaryCurrencyOptions();
  }

  // ==================== CANCEL INVITATION ====================
  const cancelInvitationModal = document.getElementById(
    'cancel-invitation-modal'
  ) as HTMLDialogElement | null;
  const invitationEmailDisplay = cancelInvitationModal?.querySelector(
    '[data-invitation-email-display]'
  );
  const confirmCancelBtn = cancelInvitationModal?.querySelector(
    '[data-confirm-cancel-invitation]'
  ) as HTMLButtonElement | null;

  // Handle cancel invitation button clicks - open modal
  document.querySelectorAll('[data-cancel-invitation]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const invitationId = btn.getAttribute('data-invitation-id');
      const invitationEmail = btn.getAttribute('data-invitation-email');

      if (
        invitationId &&
        invitationEmail &&
        invitationEmailDisplay &&
        confirmCancelBtn &&
        cancelInvitationModal
      ) {
        invitationEmailDisplay.textContent = invitationEmail;
        confirmCancelBtn.setAttribute('data-canceling-invitation-id', invitationId);
        cancelInvitationModal.showModal();
      }
    });
  });

  // Handle confirm cancel in modal
  if (confirmCancelBtn && cancelInvitationModal) {
    confirmCancelBtn.addEventListener('click', async () => {
      const invitationId = confirmCancelBtn.getAttribute('data-canceling-invitation-id');
      if (!invitationId) return;

      setButtonLoading(confirmCancelBtn, true);

      try {
        const response = await fetch(`/api/workspace/invitations?invitationId=${invitationId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: getCsrfHeaders(),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to cancel invitation');
        }

        addToast('Invitation cancelled', 'success');
        cancelInvitationModal.close();

        // Remove the invitation row from the list
        const invitationRow = document.querySelector(
          `[data-invitation-item][data-invitation-id="${invitationId}"]`
        );
        if (invitationRow) {
          invitationRow.remove();
        }

        // Check if there are no more invitations
        const remainingInvitations = document.querySelectorAll('[data-invitation-item]');
        if (remainingInvitations.length === 0) {
          const invitationsList = document.querySelector('[data-invitations-list]');
          if (invitationsList) {
            invitationsList.parentElement?.remove();
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
        addToast(message, 'error');
      } finally {
        setButtonLoading(confirmCancelBtn, false);
      }
    });
  }

  // ==================== DATA PANEL ====================
  document.querySelectorAll<HTMLButtonElement>('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.openModal;
      if (!modalId) return;
      const modal = document.getElementById(modalId) as HTMLDialogElement | null;
      modal?.showModal();
    });
  });

  const confirmClearHistoryBtn = document.querySelector(
    '[data-confirm-clear-history]'
  ) as HTMLButtonElement | null;

  if (confirmClearHistoryBtn) {
    confirmClearHistoryBtn.addEventListener('click', () => {
      addToast('Clear History is not yet implemented.', 'info');
      (document.getElementById('clear-history-modal') as HTMLDialogElement | null)?.close();
    });
  }

  const resetInput = document.getElementById(
    'factory-reset-confirm-input'
  ) as HTMLInputElement | null;
  const confirmResetBtn = document.querySelector(
    '[data-confirm-factory-reset]'
  ) as HTMLButtonElement | null;
  const factoryResetModal = document.getElementById(
    'factory-reset-modal'
  ) as HTMLDialogElement | null;

  if (resetInput && confirmResetBtn) {
    resetInput.addEventListener('input', () => {
      confirmResetBtn.disabled = resetInput.value !== 'RESET';
    });
  }

  factoryResetModal?.addEventListener('close', () => {
    if (resetInput) resetInput.value = '';
    if (confirmResetBtn) confirmResetBtn.disabled = true;
  });

  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', () => {
      addToast('Factory Reset is not yet implemented.', 'info');
      factoryResetModal?.close();
    });
  }

  // Listen for new invitations to refresh the page
  document.addEventListener(
    'invitation:created',
    () => {
      // Reload the page to show the new invitation
      window.location.reload();
    },
    { signal }
  );
}

onPageReady(initSettingsPage);
