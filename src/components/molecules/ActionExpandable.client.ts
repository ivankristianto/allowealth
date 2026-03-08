const CONTAINER_SELECTOR = '[data-action-expandable]';
const TOGGLE_SELECTOR = '[data-expandable-toggle]';
const CONTENT_SELECTOR = '[data-expandable-content]';
const LABEL_SELECTOR = '[data-toggle-label]';

const CONTROLLER_KEY = '__actionExpandableController';
const LIFECYCLE_KEY = '__actionExpandableLifecycleBound';

type InertHTMLElement = HTMLElement & { inert: boolean };

declare global {
  interface Window {
    __actionExpandableController?: AbortController;
    __actionExpandableLifecycleBound?: boolean;
  }
}

function setContentCollapsedState(content: HTMLElement, collapsed: boolean): void {
  content.setAttribute('aria-hidden', String(collapsed));

  if (collapsed) {
    content.setAttribute('inert', '');
  } else {
    content.removeAttribute('inert');
  }

  (content as InertHTMLElement).inert = collapsed;
}

function setExpandedState(container: HTMLElement, expanded: boolean): void {
  const toggle = container.querySelector<HTMLButtonElement>(TOGGLE_SELECTOR);
  const content = container.querySelector<HTMLElement>(CONTENT_SELECTOR);
  const label = container.querySelector<HTMLElement>(LABEL_SELECTOR);

  if (!toggle || !content) return;

  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.classList.toggle('is-expanded', expanded);
  content.classList.toggle('is-expanded', expanded);
  setContentCollapsedState(content, !expanded);

  if (label) {
    const expandLabel = toggle.dataset.expandLabel || 'More';
    const collapseLabel = toggle.dataset.collapseLabel || 'Less';
    label.textContent = expanded ? collapseLabel : expandLabel;
  }
}

function bindActionExpandable(container: HTMLElement, signal: AbortSignal): void {
  const toggle = container.querySelector<HTMLButtonElement>(TOGGLE_SELECTOR);
  const content = container.querySelector<HTMLElement>(CONTENT_SELECTOR);

  if (!toggle || !content) return;

  setExpandedState(container, false);

  toggle.addEventListener(
    'click',
    () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      setExpandedState(container, !isExpanded);
    },
    { signal }
  );
}

export function initActionExpandables(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  window[CONTROLLER_KEY]?.abort();

  const controller = new AbortController();
  window[CONTROLLER_KEY] = controller;
  const { signal } = controller;

  document.querySelectorAll<HTMLElement>(CONTAINER_SELECTOR).forEach((container) => {
    bindActionExpandable(container, signal);
  });
}

export function setupActionExpandableLifecycle(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (!window[LIFECYCLE_KEY]) {
    window[LIFECYCLE_KEY] = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initActionExpandables, { once: true });
    }

    document.addEventListener('astro:page-load', initActionExpandables);
  }

  if (document.readyState !== 'loading') {
    initActionExpandables();
  }
}
