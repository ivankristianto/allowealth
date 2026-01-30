/**
 * Asset Category API Client
 *
 * Client-side functions for fetching asset categories data.
 * Supports both JSON and HTML responses (via ?_render=html).
 *
 * HTML responses follow the HTMX-style pattern with comment-marked partials:
 * <!-- PARTIAL:table -->
 */

import { getCsrfHeaders } from '@/lib/csrf-client';

/**
 * Category data from API
 */
export interface AssetCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  isLiability: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  assetCount: number;
}

/**
 * Filters for fetching categories
 */
export interface AssetCategoryFilters {
  isLiability?: boolean;
  isSystem?: boolean;
  type?: 'asset' | 'liability';
}

/**
 * Parsed HTML partials response
 */
export interface AssetCategoryHtmlResponse {
  html: string;
  partials: {
    table?: string;
  };
}

/**
 * Create/Update category request
 */
export interface AssetCategoryRequest {
  name: string;
  description?: string | null;
  isLiability: boolean;
}

/**
 * Parse HTML partials from response using comment markers
 */
function parseHtmlPartials(html: string): AssetCategoryHtmlResponse['partials'] {
  const partials: AssetCategoryHtmlResponse['partials'] = {};

  // Parse table partial
  const tableMatch = html.match(/<!-- PARTIAL:table -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  if (tableMatch) {
    partials.table = tableMatch[1].trim();
  }

  return partials;
}

/**
 * Fetch all asset categories for the user
 *
 * @param filters - Optional filters
 * @param options - Options for HTML rendering
 * @returns JSON or HTML response
 */
export async function fetchAssetCategories(
  filters: AssetCategoryFilters = {},
  options: { returnHtml?: boolean } = {}
): Promise<{ success: boolean; data?: AssetCategoryResponse[] } | AssetCategoryHtmlResponse> {
  const { returnHtml = false } = options;

  const params = new URLSearchParams();
  if (filters.isLiability !== undefined) {
    params.set('isLiability', String(filters.isLiability));
  }
  if (filters.isSystem !== undefined) {
    params.set('isSystem', String(filters.isSystem));
  }
  if (filters.type) {
    params.set('type', filters.type);
  }

  if (returnHtml) {
    params.set('_render', 'html');
    params.set('_partial', 'table');
  }

  const response = await fetch(`/api/asset-categories?${params}`, {
    headers: getCsrfHeaders(),
  });

  if (returnHtml) {
    const html = await response.text();
    return {
      html,
      partials: parseHtmlPartials(html),
    };
  }

  return response.json();
}

/**
 * Create a new asset category
 *
 * @param data - Category data
 * @param options - Options for HTML rendering
 * @returns JSON or HTML response
 */
export async function createAssetCategory(
  data: AssetCategoryRequest,
  options: { returnHtml?: boolean; typeFilter?: 'asset' | 'liability' } = {}
): Promise<{ success: boolean; data?: AssetCategoryResponse } | AssetCategoryHtmlResponse> {
  const { returnHtml = false, typeFilter = 'asset' } = options;

  const params = new URLSearchParams();
  if (returnHtml) {
    params.set('_render', 'html');
    params.set('_partial', 'table');
    params.set('type', typeFilter);
  }

  const response = await fetch(`/api/asset-categories?${params}`, {
    method: 'POST',
    headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  if (returnHtml) {
    const html = await response.text();
    return {
      html,
      partials: parseHtmlPartials(html),
    };
  }

  return response.json();
}

/**
 * Update an existing asset category
 *
 * @param id - Category ID
 * @param data - Updated category data
 * @param options - Options for HTML rendering
 * @returns JSON or HTML response
 */
export async function updateAssetCategory(
  id: string,
  data: AssetCategoryRequest,
  options: { returnHtml?: boolean; typeFilter?: 'asset' | 'liability' } = {}
): Promise<{ success: boolean; data?: AssetCategoryResponse } | AssetCategoryHtmlResponse> {
  const { returnHtml = false, typeFilter = 'asset' } = options;

  const params = new URLSearchParams();
  if (returnHtml) {
    params.set('_render', 'html');
    params.set('_partial', 'table');
    params.set('type', typeFilter);
  }

  const response = await fetch(`/api/asset-categories/${id}?${params}`, {
    method: 'PUT',
    headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  if (returnHtml) {
    const html = await response.text();
    return {
      html,
      partials: parseHtmlPartials(html),
    };
  }

  return response.json();
}

/**
 * Delete an asset category
 *
 * @param id - Category ID
 * @param options - Options for HTML rendering
 * @returns JSON or HTML response
 */
export async function deleteAssetCategory(
  id: string,
  options: { returnHtml?: boolean; typeFilter?: 'asset' | 'liability' } = {}
): Promise<{ success: boolean; data?: { message: string } } | AssetCategoryHtmlResponse> {
  const { returnHtml = false, typeFilter = 'asset' } = options;

  const params = new URLSearchParams();
  if (returnHtml) {
    params.set('_render', 'html');
    params.set('_partial', 'table');
    params.set('type', typeFilter);
  }

  const response = await fetch(`/api/asset-categories/${id}?${params}`, {
    method: 'DELETE',
    headers: getCsrfHeaders(),
  });

  if (returnHtml) {
    const html = await response.text();
    return {
      html,
      partials: parseHtmlPartials(html),
    };
  }

  return response.json();
}
