/// <reference types="astro/client" />

declare module 'astro' {
  interface Locals {
    user?: any;
    session?: any;
    cspNonce?: string;
  }
}

declare global {
  interface Window {
    showToast?: (message: string, type?: string, duration?: number) => HTMLDivElement | undefined;
  }
}

/**
 * Astro type declarations
 *
 * This file extends TypeScript to recognize .astro files as modules.
 */

declare module '*.astro' {
  import { AstroComponentFactory } from 'astro';

  const component: AstroComponentFactory;
  export default component;
}

declare module '*.astro?client' {
  import { AstroComponentFactory } from 'astro';

  const component: AstroComponentFactory;
  export default component;
}

declare module '*.astro?server' {
  import { AstroComponentFactory } from 'astro';

  const component: AstroComponentFactory;
  export default component;
}

export {};
