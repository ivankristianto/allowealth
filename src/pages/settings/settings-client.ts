// Settings page tab handling

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-settings-page]') as HTMLElement | null;
  if (!container) return;

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
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      const tabId = tab.dataset.tab;
      if (!tabId) return;
      setActiveTab(tabId);
      window.history.replaceState(null, '', `#${tabId}`);
    });
  });

  window.addEventListener('hashchange', () => {
    setActiveTab(resolveTabFromHash());
  });
});
