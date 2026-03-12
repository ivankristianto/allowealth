/**
 * Marketing site configuration helpers.
 */

const DEFAULT_PUBLIC_APP_URL = 'https://demo.allowealth.io';

export function getPublicAppOrigin(): string {
  return import.meta.env.PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL;
}

export function getPublicAppUrl(path = '/'): string {
  const baseUrl = getPublicAppOrigin();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBaseUrl}/${cleanPath}`;
}
