/**
 * Astro type declarations
 *
 * This file extends TypeScript to recognize .astro files as modules.
 * It's needed for Storybook stories that import Astro components.
 */

declare module '*.astro' {
  const component: any;
  export default component;
  export const render: (args?: any) => any;
  export const __astroDirective: any;
  export const frontmatter: any;
}

declare module '*.astro?client' {
  const component: any;
  export default component;
}

declare module '*.astro?server' {
  const component: any;
  export default component;
}
