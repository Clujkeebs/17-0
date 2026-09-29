import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '0.0.0.0').trim();
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${process.env.IP_HASH_SALT ?? 'dev-salt'}:${ip}`).digest('hex').slice(0, 32);
}

export const token = (bytes = 24) => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function json(data: unknown, init?: ResponseInit & { cacheSeconds?: number }) {
  const headers = new Headers(init?.headers);
  if (init?.cacheSeconds) headers.set('Cache-Control', `public, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${init.cacheSeconds * 5}`);
  else if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return NextResponse.json(data, { ...init, headers });
}

export const errorJson = (status: number, message: string, extra?: Record<string, unknown>) => json({ error: message, ...extra }, { status });

export function requireCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  return !!secret && safeEqual(got, secret);
}
