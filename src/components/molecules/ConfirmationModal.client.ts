interface ConfirmationModalElements {
  modal: HTMLDialogElement | null;
  confirmButton: HTMLButtonElement | null;
  cancelButton: HTMLButtonElement | null;
  errorElement: HTMLElement | null;
}

export function getConfirmationModalElements(
  container: Element,
  modalId?: string
): ConfirmationModalElements {
  const resolvedId = modalId || container.getAttribute('data-id') || '';
  const modal = resolvedId
    ? (document.getElementById(resolvedId) as HTMLDialogElement | null)
    : null;
  const confirmButton = container.querySelector(
    '[data-confirm-action]'
  ) as HTMLButtonElement | null;
  const cancelButton = container.querySelector('[data-confirm-cancel]') as HTMLButtonElement | null;
  const errorElement = container.querySelector('[data-confirm-error]') as HTMLElement | null;

  return {
    modal,
    confirmButton,
    cancelButton,
    errorElement,
  };
}

export function setConfirmLoading(
  confirmButton: HTMLButtonElement | null,
  isLoading: boolean
): void {
  if (!confirmButton) return;

  if (isLoading) {
    if (!confirmButton.dataset.originalText) {
      confirmButton.dataset.originalText = confirmButton.textContent || '';
    }
    const loadingText = confirmButton.dataset.loadingText || 'Processing...';
    confirmButton.textContent = loadingText;
    confirmButton.disabled = true;
    confirmButton.setAttribute('aria-busy', 'true');
    return;
  }

  confirmButton.disabled = false;
  confirmButton.setAttribute('aria-busy', 'false');
  const originalText = confirmButton.dataset.originalText;
  if (originalText !== undefined) {
    confirmButton.textContent = originalText;
    delete confirmButton.dataset.originalText;
  }
}

export function showConfirmError(errorElement: HTMLElement | null, message: string): void {
  if (!errorElement) return;
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
}

export function clearConfirmError(errorElement: HTMLElement | null): void {
  if (!errorElement) return;
  errorElement.textContent = '';
  errorElement.classList.add('hidden');
}

export function resetConfirmationModal(
  confirmButton: HTMLButtonElement | null,
  errorElement: HTMLElement | null
): void {
  clearConfirmError(errorElement);
  setConfirmLoading(confirmButton, false);
}

export function closeConfirmationModal(modal: HTMLDialogElement | null): void {
  if (!modal) return;
  modal.classList.remove('modal-open');
  if (modal.open) {
    modal.close();
  }
}
