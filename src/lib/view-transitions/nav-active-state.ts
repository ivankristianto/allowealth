const ACTIVE_CLASSES = ['bg-accent/10', 'text-accent', 'font-bold', 'border-accent/20'];
const INACTIVE_CLASSES = [
  'text-base-content/60',
  'hover:text-base-content',
  'font-medium',
  'border-transparent',
];

function isActivePath(href: string, currentPath: string): boolean {
  if (href === '/settings') {
    return (
      currentPath === '/profile' ||
      currentPath === '/security' ||
      currentPath.startsWith('/settings')
    );
  }

  if (currentPath === href) return true;
  return currentPath.startsWith(href + '/');
}

function updateNavActiveState(): void {
  const currentPath = window.location.pathname;

  document.querySelectorAll<HTMLAnchorElement>('[data-nav-href]').forEach((link) => {
    const href = link.getAttribute('data-nav-href');
    if (!href) return;

    const active = isActivePath(href, currentPath);

    ACTIVE_CLASSES.forEach((className) => link.classList.toggle(className, active));
    INACTIVE_CLASSES.forEach((className) => link.classList.toggle(className, !active));

    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }

    const dot = link.querySelector<HTMLElement>('[data-nav-dot]');
    if (dot) {
      dot.classList.toggle('hidden', !active);
    }

    const icon = link.querySelector('svg');
    if (icon) {
      icon.classList.toggle('text-accent', active);
    }
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-mobile-nav-href]').forEach((link) => {
    const href = link.getAttribute('data-mobile-nav-href');
    if (!href) return;

    const active = isActivePath(href, currentPath);
    link.classList.toggle('text-accent', active);

    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }

    const iconBg = link.querySelector<HTMLElement>('span.rounded-full');
    if (iconBg) {
      iconBg.classList.toggle('bg-accent/20', active);
      iconBg.classList.toggle('bg-base-200', !active);
    }

    const icon = link.querySelector('svg');
    if (icon) {
      icon.classList.toggle('scale-110', active);
    }
  });
}

document.addEventListener('astro:after-swap', updateNavActiveState);
