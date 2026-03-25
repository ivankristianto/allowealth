const DEFAULT_IGNORE_FROM = 'input, textarea, select, [role="listbox"]';
const DEFAULT_DISTANCE_THRESHOLD = 0.25;
const DEFAULT_VELOCITY_THRESHOLD = 0.4; // px/ms

export interface SwipeGestureConfig {
  direction: 'down' | 'right' | 'left';
  element: HTMLElement;
  target: HTMLElement;
  distanceThresholdPx?: number;
  distanceThreshold?: number;
  velocityThreshold?: number;
  ignoreFrom?: string;
  onThreshold: () => void;
  onMove?: (progress: number) => void;
  onCancel?: () => void;
}

export class SwipeGesture {
  private config: Required<
    Pick<
      SwipeGestureConfig,
      'direction' | 'element' | 'target' | 'velocityThreshold' | 'ignoreFrom' | 'onThreshold'
    >
  > &
    Pick<SwipeGestureConfig, 'distanceThresholdPx' | 'distanceThreshold' | 'onMove' | 'onCancel'>;

  private controller: AbortController;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private directionLocked: boolean | null = null; // null = not determined, true = locked to swipe, false = aborted
  private prefersReducedMotion: boolean;

  constructor(config: SwipeGestureConfig) {
    this.config = {
      ...config,
      velocityThreshold: config.velocityThreshold ?? DEFAULT_VELOCITY_THRESHOLD,
      ignoreFrom: config.ignoreFrom ?? DEFAULT_IGNORE_FROM,
    };

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controller = new AbortController();
    const { signal } = this.controller;
    const el = config.element;

    el.addEventListener('touchstart', this.handleTouchStart, { passive: true, signal });
    el.addEventListener('touchmove', this.handleTouchMove, { passive: true, signal });
    el.addEventListener('touchend', this.handleTouchEnd, { signal });
    el.addEventListener('touchcancel', this.handleTouchCancel, { signal });
  }

  destroy(): void {
    this.controller.abort();
  }

  reset(): void {
    this.isDragging = false;
    this.directionLocked = null;
    this.config.target.style.transition = '';
    this.config.target.style.transform = '';
  }

  private getEffectiveThreshold(): number {
    if (this.config.distanceThresholdPx != null) {
      return this.config.distanceThresholdPx;
    }
    const fraction = this.config.distanceThreshold ?? DEFAULT_DISTANCE_THRESHOLD;
    return fraction * this.getDimension();
  }

  /** Full swipeable dimension used as the denominator for progress (0-1). */
  private getProgressDenominator(): number {
    if (this.config.distanceThresholdPx != null) {
      return this.config.distanceThresholdPx;
    }
    return this.getDimension();
  }

  private getDimension(): number {
    const { direction, target } = this.config;
    return direction === 'down' ? target.offsetHeight : target.offsetWidth;
  }

  private getDelta(clientX: number, clientY: number): number {
    const { direction } = this.config;
    if (direction === 'down') {
      return Math.max(0, clientY - this.startY);
    } else if (direction === 'right') {
      return Math.max(0, clientX - this.startX);
    } else {
      // left: delta is negative
      return Math.min(0, clientX - this.startX);
    }
  }

  private getTransform(delta: number): string {
    const { direction } = this.config;
    if (direction === 'down') {
      return `translateY(${delta}px)`;
    }
    return `translateX(${delta}px)`;
  }

  private checkDirectionLock(clientX: number, clientY: number): boolean {
    const dx = Math.abs(clientX - this.startX);
    const dy = Math.abs(clientY - this.startY);

    // Need some minimum movement to determine direction
    if (dx < 3 && dy < 3) return true; // too small to determine, continue

    const { direction } = this.config;
    if (direction === 'down') {
      // Down: dominant axis should be Y
      return dy >= dx;
    } else {
      // Left or right: dominant axis should be X
      return dx >= dy;
    }
  }

  /**
   * Walk up from `el` checking each ancestor against `selector`.
   * Uses native `closest()` when available, falls back to manual
   * matching for environments where the selector engine throws
   * (e.g. happy-dom missing `window.SyntaxError`).
   */
  private closestIgnored(el: HTMLElement, selector: string): boolean {
    try {
      return el.closest(selector) !== null;
    } catch {
      // Fallback: manual walk-up with simple selector matching
      const parts = selector.split(',').map((s) => s.trim());
      let node: HTMLElement | null = el;
      while (node && node.nodeType === 1) {
        for (const part of parts) {
          if (this.matchesPart(node, part)) return true;
        }
        node = node.parentElement;
      }
      return false;
    }
  }

  /** Match a single simple selector (tag, .class, #id, [attr] or [attr="val"]). */
  private matchesPart(el: HTMLElement, sel: string): boolean {
    if (sel.startsWith('.')) {
      return el.classList?.contains(sel.slice(1)) ?? false;
    }
    if (sel.startsWith('#')) {
      return el.id === sel.slice(1);
    }
    if (sel.startsWith('[')) {
      const m = /^\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(sel);
      if (!m) return false;
      const [, attr, val] = m;
      return val !== undefined ? el.getAttribute(attr) === val : el.hasAttribute(attr);
    }
    return el.tagName?.toLowerCase() === sel.toLowerCase();
  }

  private handleTouchStart = (e: TouchEvent): void => {
    const touchTarget = e.target as HTMLElement;
    if (this.closestIgnored(touchTarget, this.config.ignoreFrom)) return;

    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.isDragging = true;
    this.directionLocked = null;

    if (!this.prefersReducedMotion) {
      this.config.target.style.transition = 'none';
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging) return;

    const touch = e.touches[0];

    // Direction lock on first move
    if (this.directionLocked === null) {
      const isParallel = this.checkDirectionLock(touch.clientX, touch.clientY);
      if (touch.clientX === this.startX && touch.clientY === this.startY) {
        return; // no movement yet
      }
      this.directionLocked = isParallel;
      if (!isParallel) {
        this.isDragging = false;
        this.config.target.style.transition = '';
        return;
      }
    }

    if (this.directionLocked === false) return;

    const delta = this.getDelta(touch.clientX, touch.clientY);
    const denominator = this.getProgressDenominator();
    const progress = Math.min(1, Math.abs(delta) / denominator);

    if (!this.prefersReducedMotion) {
      this.config.target.style.transform = this.getTransform(delta);
    }

    this.config.onMove?.(progress);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    // If direction was never locked (too small movement) or aborted, just clean up
    if (this.directionLocked !== true) {
      this.config.target.style.transition = '';
      this.config.target.style.transform = '';
      return;
    }

    const touch = e.changedTouches[0];
    const delta = this.getDelta(touch.clientX, touch.clientY);
    const absDelta = Math.abs(delta);

    const elapsed = Date.now() - this.startTime;
    // Require a minimum elapsed time to compute meaningful velocity;
    // near-zero elapsed would produce artificially huge values.
    const MIN_ELAPSED_MS = 10;
    const velocity = elapsed >= MIN_ELAPSED_MS ? absDelta / elapsed : 0;

    const threshold = this.getEffectiveThreshold();

    this.config.target.style.transition = '';

    if (absDelta >= threshold || velocity >= this.config.velocityThreshold) {
      this.config.onThreshold();
    } else {
      this.config.target.style.transform = '';
      this.config.onCancel?.();
    }

    this.directionLocked = null;
  };

  private handleTouchCancel = (): void => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.directionLocked = null;
    this.config.target.style.transition = '';
    this.config.target.style.transform = '';
    this.config.onCancel?.();
  };
}
