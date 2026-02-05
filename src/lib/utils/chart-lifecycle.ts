export interface ChartLifecycleOptions<TData = unknown> {
  containerSelector: string;
  parseData?: (raw: unknown) => TData | null;
  onInit: (container: HTMLElement, data: TData) => void;
  onThemeChange?: () => void;
  onCleanup?: () => void;
  rootMargin?: string;
}

export function isDarkTheme(): boolean {
  const explicitTheme = document.documentElement.getAttribute('data-theme');
  if (explicitTheme) {
    return explicitTheme === 'dark' || explicitTheme === 'night';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function createChartLifecycle<TData>({
  containerSelector,
  parseData,
  onInit,
  onThemeChange,
  onCleanup,
  rootMargin = '50px',
}: ChartLifecycleOptions<TData>): { init: () => void; cleanup: () => void } {
  let observer: IntersectionObserver | null = null;
  let themeObserver: MutationObserver | null = null;
  let systemThemeMediaQuery: MediaQueryList | null = null;

  function cleanup(): void {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    if (systemThemeMediaQuery) {
      systemThemeMediaQuery.removeEventListener('change', handleSystemThemeChange);
      systemThemeMediaQuery = null;
    }

    onCleanup?.();
  }

  function handleSystemThemeChange(): void {
    const explicitTheme = document.documentElement.getAttribute('data-theme');
    if (!explicitTheme) {
      onThemeChange?.();
    }
  }

  function initThemeObserver(): void {
    if (!onThemeChange) return;

    if (themeObserver) {
      themeObserver.disconnect();
    }

    themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          onThemeChange();
        }
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    if (window.matchMedia) {
      systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange);
    }
  }

  function init(): void {
    cleanup();
    initThemeObserver();

    const chartContainers = document.querySelectorAll(containerSelector);

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const container = entry.target as HTMLElement;
          observer?.unobserve(container);

          const dataSource =
            (container.closest('[data-chart-data]') as HTMLElement | null) || container;
          const dataAttr = dataSource.getAttribute('data-chart-data');
          if (!dataAttr) return;

          try {
            const rawData = JSON.parse(dataAttr);
            const parsed = parseData ? parseData(rawData) : (rawData as TData);
            if (!parsed) return;
            onInit(container, parsed);
          } catch (error) {
            console.warn('Failed to initialize chart:', error);
          }
        });
      },
      { rootMargin }
    );

    chartContainers.forEach((container) => observer?.observe(container));
  }

  return { init, cleanup };
}
