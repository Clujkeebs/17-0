export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { sql as dsql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { getRedis } from '@/lib/server/redis';

function withTimeout<T>(p: Promise<T>, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function check(fn: () => Promise<unknown>): Promise<'ok' | 'error'> {
  try { await withTimeout(fn()); return 'ok'; } catch { return 'error'; }
}

export async function GET() {
  const [dbStatus, redisStatus] = await Promise.all([
    check(() => db.execute(dsql`select 1`)),
    check(() => getRedis().ping()),
  ]);
  const status = dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded';
  return NextResponse.json(
    { status, db: dbStatus, redis: redisStatus, version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev', time: new Date().toISOString() },
    { status: dbStatus === 'ok' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
