export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { SITE } from '@/lib/site';
import { unsubscribeByToken } from '@/lib/server/newsletter';

function redirectTo(ok: boolean) {
  const res = NextResponse.redirect(`${SITE.url}/newsletter/unsubscribed${ok ? '' : '?reason=invalid'}`, 303);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

async function run(t: string) {
  try { return await unsubscribeByToken(t); } catch (e) { console.error('[newsletter:unsubscribe]', (e as Error).message); return false; }
}

/** Link click from an email footer: unsubscribe instantly, then show the confirmation page. */
export async function GET(req: Request) {
  return redirectTo(await run(new URL(req.url).searchParams.get('token') ?? ''));
}

/**
 * RFC 8058 one-click (mail client POSTs "List-Unsubscribe=One-Click" to the header URL): 200, no redirect.
 * Also accepts a plain form post with a token field.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const t = new URL(req.url).searchParams.get('token') ?? String(form?.get('token') ?? '');
  const ok = await run(t);
  if (form?.get('List-Unsubscribe') === 'One-Click') {
    return new Response(null, { status: ok ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return redirectTo(ok);
}
