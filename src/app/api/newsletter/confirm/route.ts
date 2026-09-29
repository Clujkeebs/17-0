export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { SITE } from '@/lib/site';
import { confirmSubscription } from '@/lib/server/newsletter';

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('token') ?? '';
  let outcome: Awaited<ReturnType<typeof confirmSubscription>> = 'invalid';
  try { outcome = await confirmSubscription(t); } catch (e) { console.error('[newsletter:confirm]', (e as Error).message); }
  const dest = outcome === 'confirmed' ? '/newsletter/confirmed' : `/newsletter/expired${outcome === 'invalid' ? '?reason=invalid' : ''}`;
  const res = NextResponse.redirect(`${SITE.url}${dest}`, 303);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
