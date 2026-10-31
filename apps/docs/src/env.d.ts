/// <reference types="astro/client" />

// Starlight 0.42 ships compiled JS and no longer publishes virtual.d.ts.
declare module 'virtual:starlight/user-config' {
  const config: import('@astrojs/starlight/types').StarlightConfig;
  export default config;
}
