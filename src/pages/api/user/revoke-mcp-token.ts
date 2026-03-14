import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db, getActiveSchema } from '@/db';
import { auth } from '@/lib/auth/server';
import { invalidateMcpToken } from '@/lib/mcp-auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const form = await request.formData();
  const tokenId = form.get('tokenId')?.toString();
  if (!tokenId) {
    return new Response('Missing tokenId', { status: 400 });
  }

  const schema = getActiveSchema();
  const tokenRow = await db.query.oauthAccessToken.findFirst({
    where: eq(schema.oauthAccessToken.id, tokenId),
    columns: { id: true, userId: true },
  });

  if (!tokenRow || tokenRow.userId !== session.user.id) {
    return new Response('Not found', { status: 404 });
  }

  await db
    .delete(schema.oauthAccessToken)
    .where(
      and(
        eq(schema.oauthAccessToken.id, tokenId),
        eq(schema.oauthAccessToken.userId, session.user.id)
      )
    );
  await invalidateMcpToken(tokenRow.id);

  return redirect('/security');
};
