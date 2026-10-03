import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireOwner } from '@/lib/server/owner';
import { OWNER_REPLIES } from '@/content/owner-replies';
import { OwnerInbox } from './OwnerInbox';
import { OwnerTools } from './OwnerTools';
import { GAMES } from '@/lib/game-registry';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Owner', robots: { index: false, follow: false } };

export default async function OwnerPage() {
  if (!(await requireOwner())) notFound();
  const rows = await db.select().from(schema.ownerNotes).orderBy(desc(schema.ownerNotes.createdAt)).limit(100);
  const notes = rows.map((r) => ({ id: r.id, body: r.body, page: r.page, createdAt: r.createdAt.toISOString(), reply: OWNER_REPLIES[r.id.slice(0, 8)] ?? null }));
  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Owner only</span>
      <h1>Notes to Claude</h1>
      <p className="muted">Write what you or your friends found. Notes are read every hour; fixes ship and the reply shows up here. Anything about money, deleting data or accounts waits until you confirm it in the chat.</p>
      <OwnerInbox notes={notes} />
      <OwnerTools games={GAMES.map((g) => ({ slug: g.slug, name: g.name }))} />
    </div>
  );
}
