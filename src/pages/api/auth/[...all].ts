import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/server';

const handler: APIRoute = ({ request }) => auth.handler(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
