function initAssetCategoriesPage() {
  const searchForm = document.getElementById(
    'asset-category-search-form'
  ) as HTMLFormElement | null;

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(searchForm);
    const url = new URL(window.location.href);
    url.searchParams.set('search', (formData.get('search') as string) || '');
    url.searchParams.set('type', (formData.get('type') as string) || 'asset');
    window.location.href = url.toString();
  });

  document.querySelectorAll('[data-action="create-asset-category"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (typeof (window as any).openAssetCategoryModal === 'function') {
        (window as any).openAssetCategoryModal('create');
      }
    });
  });

  document.querySelectorAll('[data-action="edit-asset-category"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const categoryId = target.dataset.categoryId || '';
      if (!categoryId) return;

      if (typeof (window as any).openAssetCategoryModal === 'function') {
        (window as any).openAssetCategoryModal('edit', {
          id: categoryId,
          name: target.dataset.categoryName || '',
          description: target.dataset.categoryDescription || '',
          type: (target.dataset.categoryType as 'asset' | 'liability') || 'asset',
        });
      }
    });
  });

  document.querySelectorAll('[data-action="delete-asset-category"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const categoryId = target.dataset.categoryId || '';
      const categoryName = target.dataset.categoryName || '';
      const categoryMeta = target.dataset.categoryMeta || '';

      if (categoryId && typeof (window as any).openDeleteAssetCategoryDialog === 'function') {
        (window as any).openDeleteAssetCategoryDialog(categoryId, categoryName, categoryMeta);
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetCategoriesPage);
} else {
  initAssetCategoriesPage();
}
