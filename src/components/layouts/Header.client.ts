const HEADER_LISTENER_KEY = '__headerDrawerListenerInitialized';

interface HeaderWindow extends Window {
  [HEADER_LISTENER_KEY]?: boolean;
}

function dispatchDrawerOpenEvent(): void {
  document.dispatchEvent(new CustomEvent('open-transaction-drawer'));
}

function handleHeaderClick(event: Event): void {
  const target = event.target as HTMLElement | null;
  const trigger =
    target?.closest('[data-open-transaction-drawer]') ?? target?.closest('#bulk-entry-button');
  if (!trigger) return;

  dispatchDrawerOpenEvent();
}

function initHeaderDrawerListener(): void {
  const scopedWindow = window as HeaderWindow;
  if (scopedWindow[HEADER_LISTENER_KEY]) return;

  document.addEventListener('click', handleHeaderClick);
  scopedWindow[HEADER_LISTENER_KEY] = true;
}

initHeaderDrawerListener();
