import { SwipeGesture } from '@/lib/gestures/swipe';

const LG_BREAKPOINT = 1024;
const ACTION_PANEL_WIDTH = 128; // 2 × 64px buttons

let currentlyRevealed: { gesture: SwipeGesture; container: HTMLElement } | null = null;
const gestures: SwipeGesture[] = [];
let cleanupController: AbortController | null = null;

function closeRevealed(): void {
  if (currentlyRevealed) {
    currentlyRevealed.gesture.reset();
    currentlyRevealed = null;
  }
}

function initSwipeRows(): void {
  // Only on mobile
  if (window.innerWidth >= LG_BREAKPOINT) return;

  destroySwipeRows();
  cleanupController = new AbortController();
  const { signal } = cleanupController;

  const containers = document.querySelectorAll<HTMLElement>('[data-swipe-container]');
  containers.forEach((container) => {
    const content = container.querySelector<HTMLElement>('[data-swipe-content]');
    if (!content) return;

    const gesture = new SwipeGesture({
      direction: 'left',
      element: content,
      target: content,
      distanceThresholdPx: ACTION_PANEL_WIDTH,
      onMove: () => {
        // Close any other revealed row when starting a new swipe
        if (currentlyRevealed && currentlyRevealed.container !== container) {
          closeRevealed();
        }
      },
      onThreshold: () => {
        // Snap to revealed position
        content.style.transform = `translateX(-${ACTION_PANEL_WIDTH}px)`;
        currentlyRevealed = { gesture, container };
      },
      onCancel: () => {
        if (currentlyRevealed?.container === container) {
          currentlyRevealed = null;
        }
      },
    });

    gestures.push(gesture);
  });

  // Close revealed row on outside click
  document.addEventListener(
    'click',
    (e) => {
      if (!currentlyRevealed) return;
      const target = e.target as HTMLElement;
      if (!currentlyRevealed.container.contains(target)) {
        closeRevealed();
      }
    },
    { signal }
  );

  // Close revealed row on scroll
  const listContainer = document.querySelector('#transaction-list');
  if (listContainer) {
    listContainer.addEventListener(
      'scroll',
      () => {
        closeRevealed();
      },
      { passive: true, signal }
    );
  }
}

function destroySwipeRows(): void {
  closeRevealed();
  gestures.forEach((g) => g.destroy());
  gestures.length = 0;
  cleanupController?.abort();
  cleanupController = null;
}

// Initialize swipe rows
function initTransactionSwipe(): void {
  initSwipeRows();
}

function cleanupTransactionSwipe(): void {
  destroySwipeRows();
}

// Hook into Astro view transitions for SPA navigation compatibility
// This ensures swipe gestures are initialized/cleaned up correctly across navigations
if (typeof window !== 'undefined') {
  window.addEventListener('astro:page-load', () => {
    initTransactionSwipe();
  });

  window.addEventListener('astro:before-swap', () => {
    cleanupTransactionSwipe();
  });
}

export { initTransactionSwipe, cleanupTransactionSwipe };
