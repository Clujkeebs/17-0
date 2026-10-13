import { sql as dsql } from 'drizzle-orm';
import { db } from '@/db';
import { decodeDataUrl } from '@/lib/avatar';

export const runtime = 'nodejs';

/**
 * A player's profile picture as a real image, so pages can cache it. The URL carries a version (?v=), which changes when
 * the picture does, so with a version it is cached for a year and without one for five minutes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return new Response(null, { status: 404 });
  const rows = await db.execute<{ image: string | null }>(dsql`select image from user_accounts where lower(username) = ${username.toLowerCase()} limit 1`).catch(() => []);
  const img = decodeDataUrl(rows[0]?.image);
  if (!img) return new Response(null, { status: 404, headers: { 'cache-control': 'public, max-age=60' } });
  const versioned = new URL(req.url).searchParams.has('v');
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      'content-type': img.type,
      'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300, stale-while-revalidate=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}
