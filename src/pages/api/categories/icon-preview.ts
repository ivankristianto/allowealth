/**
 * Category Icon Preview API
 *
 * Returns the CategoryIcon markup the CategoryModal swaps in when the user
 * picks a different icon or color.
 *
 * GET /api/categories/icon-preview?icon=house&color=bg-primary
 */

import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CategoryIcon from '@/components/atoms/CategoryIcon.astro';
import { isIconSupported } from '@/lib/utils/supportedCategoryIcons';

const VALID_COLORS = [
  'bg-primary',
  'bg-secondary',
  'bg-accent',
  'bg-neutral',
  'bg-success',
  'bg-warning',
  'bg-error',
  'bg-info',
];

export async function GET(context: APIContext): Promise<Response> {
  const url = new URL(context.request.url);
  const icon = url.searchParams.get('icon') || 'tag';
  const color = url.searchParams.get('color') || 'bg-primary';

  const safeIcon = isIconSupported(icon) ? icon : 'tag';
  const safeColor = VALID_COLORS.includes(color) ? color : 'bg-primary';

  // Same component and size as the modal's initial render, so the preview can't drift from the saved icon.
  const container = await AstroContainer.create();
  const html = await container.renderToString(CategoryIcon, {
    props: { icon: safeIcon, color: safeColor, size: 'md' },
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
