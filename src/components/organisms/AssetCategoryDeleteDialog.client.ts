import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';

const initializedContainers = new WeakSet<Element>();
let currentCategoryId = '';

function initAssetCategoryDeleteDialogs() {
  document
    .querySelectorAll('[data-asset-category-delete-dialog-container]')
    .forEach((container) => {
      if (initializedContainers.has(container)) return;
      initializedContainers.add(container);

      const id = container.getAttribute('data-id');
      if (!id) return;

      const dialog = document.getElementById(id) as HTMLDialogElement | null;
      const cancelBtn = container.querySelector('[data-cancel-delete]');
      const confirmBtn = container.querySelector(
        '[data-confirm-delete]'
      ) as HTMLButtonElement | null;
      const errorDiv = container.querySelector('[data-delete-error]') as HTMLElement | null;
      const nameEl = container.querySelector('[data-category-name]') as HTMLElement | null;
      const metaEl = container.querySelector('[data-category-meta]') as HTMLElement | null;

      if (!dialog || !confirmBtn) return;

      cancelBtn?.addEventListener('click', () => {
        errorDiv?.classList.add('hidden');
        dialog.close();
      });

      confirmBtn.addEventListener('click', async () => {
        if (!currentCategoryId) return;

        const originalText = confirmBtn.textContent || 'Delete';
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
        errorDiv?.classList.add('hidden');
        if (errorDiv) errorDiv.textContent = '';

        try {
          const response = await fetch(`/api/asset-categories/${currentCategoryId}`, {
            method: 'DELETE',
            headers: getCsrfHeaders(),
          });

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to delete category');
          }

          addToast('Category deleted successfully!', 'success');
          dialog.close();
          const url = new URL(window.location.href);
          window.location.href = url.pathname + url.search;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete category';
          if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
          }
          addToast(message, 'error');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      });

      (window as any).openDeleteAssetCategoryDialog = (
        categoryId: string,
        categoryName: string,
        categoryMeta: string
      ) => {
        currentCategoryId = categoryId;
        if (nameEl) nameEl.textContent = categoryName;
        if (metaEl) metaEl.textContent = categoryMeta;
        errorDiv?.classList.add('hidden');
        if (errorDiv) errorDiv.textContent = '';
        dialog.showModal();
      };
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetCategoryDeleteDialogs);
} else {
  initAssetCategoryDeleteDialogs();
}

document.addEventListener('astro:page-load', initAssetCategoryDeleteDialogs);
