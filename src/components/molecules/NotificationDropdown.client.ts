function initNotificationDropdown() {
  const containers = document.querySelectorAll('[data-notification-dropdown-container]');

  containers.forEach((container) => {
    const button = container.querySelector('[data-notification-button]');
    const panel = container.querySelector('[data-notification-panel]');
    const closeBtn = container.querySelector('[data-close-notifications]');

    if (!button || !panel) return;

    function toggleDropdown() {
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden');
      button.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    }

    function closeDropdown() {
      panel.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
    }

    function handleButtonClick(event: MouseEvent) {
      event.stopPropagation();
      toggleDropdown();
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
        closeDropdown();
      }
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!event.target || !(event.target instanceof Node)) return;
      const clickedInPanel = panel.contains(event.target);
      const clickedOnButton = button.contains(event.target);
      if (!clickedInPanel && !clickedOnButton && !panel.classList.contains('hidden')) {
        closeDropdown();
      }
    }

    button.addEventListener('click', handleButtonClick);
    closeBtn?.addEventListener('click', closeDropdown);

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleDocumentClick);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotificationDropdown);
} else {
  initNotificationDropdown();
}

document.addEventListener('astro:page-load', initNotificationDropdown);
