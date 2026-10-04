/**
 * Page script lifecycle helper for Astro's ClientRouter.
 *
 * Astro executes a bundled `<script>` only once per full page load. Top-level
 * setup code therefore never sees DOM swapped in by a soft navigation, leaving
 * forms without their submit handlers (the browser then performs a native
 * submission instead).
 *
 * `astro:page-load` covers soft navigations, but on a full load it only fires
 * after `window.load`, so setup also runs as soon as the DOM is parsed. Runs
 * are keyed on the `<body>` element, which ClientRouter replaces on every
 * navigation, so the initial `astro:page-load` does not trigger a second run.
 *
 * Each run receives a fresh AbortSignal (the previous one is aborted); pass it
 * to listeners registered on `document`/`window` so they don't stack up.
 */
export function onPageReady(setup: (signal: AbortSignal) => void): void {
  let controller: AbortController | null = null;
  let initializedBody: HTMLElement | null = null;

  const run = () => {
    if (document.body === initializedBody) return;
    initializedBody = document.body;
    controller?.abort();
    controller = new AbortController();
    setup(controller.signal);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
  document.addEventListener('astro:page-load', run);
}
