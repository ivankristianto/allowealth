import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';

type AssetCategoryMode = 'create' | 'edit';

type AssetCategoryValues = {
  id?: string;
  name?: string;
  description?: string | null;
  type?: 'asset' | 'liability';
};

const initializedContainers = new WeakSet<Element>();

function initAssetCategoryModals() {
  document.querySelectorAll('[data-asset-category-modal-container]').forEach((container) => {
    if (initializedContainers.has(container)) return;
    initializedContainers.add(container);

    const id = container.getAttribute('data-id');
    if (!id) return;

    const modal = document.getElementById(id) as HTMLDialogElement | null;
    const form = container.querySelector('[data-asset-category-form]') as HTMLFormElement | null;
    const cancelBtn = container.querySelector('[data-cancel]');
    const errorDiv = container.querySelector('[data-form-error]') as HTMLElement | null;
    const titleEl = container.querySelector('[data-modal-title]');
    const subtitleEl = container.querySelector('[data-modal-subtitle]');
    const submitText = container.querySelector('[data-submit-text]');

    if (!modal || !form) return;

    const idInput = form.querySelector('[name="id"]') as HTMLInputElement | null;
    const nameInput = form.querySelector('[name="name"]') as HTMLInputElement | null;
    const descriptionInput = form.querySelector(
      '[name="description"]'
    ) as HTMLTextAreaElement | null;
    const typeSelect = form.querySelector('[name="type"]') as HTMLSelectElement | null;

    const setMode = (mode: AssetCategoryMode, values?: AssetCategoryValues) => {
      if (titleEl) {
        titleEl.textContent = mode === 'edit' ? 'Edit Category' : 'Add Category';
      }
      if (subtitleEl) {
        subtitleEl.textContent =
          mode === 'edit'
            ? 'Update the category details.'
            : 'Create a new category for your assets or liabilities.';
      }
      if (submitText) {
        submitText.textContent = mode === 'edit' ? 'Update Category' : 'Save Category';
      }

      if (idInput) idInput.value = values?.id || '';
      if (nameInput) nameInput.value = values?.name || '';
      if (descriptionInput) descriptionInput.value = values?.description || '';
      if (typeSelect) typeSelect.value = values?.type || 'asset';

      container.setAttribute('data-mode', mode);
      errorDiv?.classList.add('hidden');
      errorDiv && (errorDiv.textContent = '');
    };

    const resetForm = () => {
      form.reset();
      if (idInput) idInput.value = '';
      errorDiv?.classList.add('hidden');
      if (errorDiv) errorDiv.textContent = '';
      setMode('create');
    };

    cancelBtn?.addEventListener('click', () => {
      resetForm();
      modal.close();
    });

    modal.addEventListener('close', () => {
      resetForm();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      const originalText = submitText?.textContent || 'Save';

      errorDiv?.classList.add('hidden');
      if (errorDiv) errorDiv.textContent = '';

      const formData = new FormData(form);
      const categoryId = (formData.get('id') as string) || '';
      const name = (formData.get('name') as string) || '';
      const description = (formData.get('description') as string) || '';
      const type = (formData.get('type') as string) || 'asset';

      if (!name.trim()) {
        if (errorDiv) {
          errorDiv.textContent = 'Category name is required.';
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      if (name.trim().length > 100) {
        if (errorDiv) {
          errorDiv.textContent = 'Category name must be 100 characters or less.';
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      if (description.length > 500) {
        if (errorDiv) {
          errorDiv.textContent = 'Description must be 500 characters or less.';
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isLiability: type === 'liability',
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Saving...';
      }

      try {
        const url = categoryId ? `/api/asset-categories/${categoryId}` : '/api/asset-categories';
        const method = categoryId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const message = result.error?.message || 'Failed to save category';
          throw new Error(message);
        }

        addToast(
          categoryId ? 'Category updated successfully!' : 'Category created successfully!',
          'success'
        );

        modal.close();
        const urlParams = new URL(window.location.href);
        window.location.href = urlParams.pathname + urlParams.search;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save category';
        if (errorDiv) {
          errorDiv.textContent = message;
          errorDiv.classList.remove('hidden');
        }
        addToast(message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitText) submitText.textContent = originalText;
        }
      }
    });

    (window as any).openAssetCategoryModal = (
      mode: AssetCategoryMode,
      values?: AssetCategoryValues
    ) => {
      setMode(mode, values);
      modal.showModal();
    };
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetCategoryModals);
} else {
  initAssetCategoryModals();
}

document.addEventListener('astro:page-load', initAssetCategoryModals);
