import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq, inArray, lt, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getRedis, invalidatePrefix } from '@/lib/server/redis';
import { fetchRatings, type RawRatings } from './fetch';
import { parseRatings } from './parse';
import { diffPlayers, matchExisting, validate } from './diff';
import type { ExistingPlayer, FeedPlayer, SyncSummary } from './types';

const MAX_RAW_BYTES = 5 * 1024 * 1024;
const SNAPSHOT_RETENTION_DAYS = 30;
export const SYNC_CHANNEL = 'gl:sync';

const snapshotDir = () => process.env.SNAPSHOT_DIR ?? './snapshots';
const maddenVersion = () => process.env.MADDEN_VERSION ?? 'madden-27';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export class SyncError extends Error {
  constructor(message: string, readonly summary: SyncSummary) { super(message); this.name = 'SyncError'; }
}

async function notifySlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(10_000) });
  } catch (e) { console.error('[sync] slack notify failed', (e as Error).message); }
}

/** Team label from the feed ("Kansas City Chiefs", "Chiefs", "KC") -> teams.id. */
export function buildTeamResolver(teams: { id: number; slug: string; name: string; city: string; abbreviation: string }[]) {
  const map = new Map<string, number>();
  for (const t of teams) {
    for (const k of [t.slug, t.name, `${t.city} ${t.name}`, t.abbreviation]) map.set(norm(k), t.id);
  }
  map.set('was', map.get('was') ?? map.get('wsh') ?? -1);
  map.set('wsh', map.get('was') ?? -1);
  return (label: string | null): number | null | undefined => {
    if (!label) return null;
    const key = norm(label);
    if (key === 'freeagent' || key === 'freeagents' || key === 'fa') return null;
    const id = map.get(key);
    return id != null && id > 0 ? id : undefined; // undefined = unresolved
  };
}

/** Unique slug for a new row: name, then name-position, then name-team, then name-id. */
function uniqueSlug(p: FeedPlayer, used: Set<string>): string {
  const candidates = [p.slug, `${p.slug}-${p.position.toLowerCase()}`, `${p.slug}-${norm(p.teamLabel ?? 'fa')}`, `${p.slug}-${norm(p.maddenId)}`];
  for (const c of candidates) if (c && !used.has(c)) { used.add(c); return c; }
  const fallback = `${p.slug}-${Date.now().toString(36)}`;
  used.add(fallback);
  return fallback;
}

async function writeSnapshotFile(id: number, raw: string) {
  try {
    const dir = snapshotDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${id}.json`), raw, 'utf8');
  } catch (e) { console.warn('[sync] snapshot file write skipped:', (e as Error).message); }
}

async function afterCommit(summary: SyncSummary) {
  try {
    await Promise.all(['player:', 'roster:', 'teams:'].map((p) => invalidatePrefix(p)));
    await getRedis().publish(SYNC_CHANNEL, JSON.stringify({ at: new Date().toISOString(), snapshotId: summary.snapshotId, updated: summary.updated, added: summary.added }));
  } catch (e) { console.warn('[sync] cache invalidation failed:', (e as Error).message); }
}

export interface RunSyncOptions {
  dryRun?: boolean;
  /** Injected for tests or manual imports; defaults to fetchRatings(). */
  fetcher?: () => Promise<RawRatings>;
  /** Throw SyncError on failure (default true, so BullMQ records the job as failed). */
  throwOnError?: boolean;
}

export async function runSync({ dryRun = false, fetcher = fetchRatings, throwOnError = true }: RunSyncOptions = {}): Promise<SyncSummary> {
  const started = Date.now();
  const summary: SyncSummary = {
    ok: false, dryRun, snapshotId: null, sourceUrl: '', parsed: 0, added: 0, updated: 0, unchanged: 0,
    deactivated: 0, historyRows: 0, unresolvedTeams: [], errors: [], warnings: [], durationMs: 0,
  };

  const [snap] = await db.insert(schema.syncSnapshots).values({ sourceUrl: 'pending', status: dryRun ? 'dry-run' : 'running' }).returning({ id: schema.syncSnapshots.id });
  summary.snapshotId = snap.id;

  try {
    const raw = await fetcher();
    summary.sourceUrl = raw.sourceUrl;
    const rawJson = JSON.stringify(raw.pages);
    await db.update(schema.syncSnapshots).set({ sourceUrl: raw.sourceUrl, rawHtml: rawJson.length > MAX_RAW_BYTES ? rawJson.slice(0, MAX_RAW_BYTES) : rawJson })
      .where(eq(schema.syncSnapshots.id, snap.id));
    await writeSnapshotFile(snap.id, rawJson);

    const incoming = parseRatings(raw.pages);
    summary.parsed = incoming.length;

    const existing: ExistingPlayer[] = await db.select({
      id: schema.players.id, maddenId: schema.players.maddenId, slug: schema.players.slug, overallRating: schema.players.overallRating,
      attributes: schema.players.attributes, maddenVersion: schema.players.maddenVersion, isActive: schema.players.isActive,
      isAllTimeGreat: schema.players.isAllTimeGreat,
    }).from(schema.players);

    const v = validate(incoming, existing);
    summary.warnings.push(...v.warnings);
    if (!v.ok) { summary.errors.push(...v.errors); throw new Error(`Validation failed with ${v.errors.length} error(s)`); }

    const teams = await db.select({ id: schema.teams.id, slug: schema.teams.slug, name: schema.teams.name, city: schema.teams.city, abbreviation: schema.teams.abbreviation }).from(schema.teams);
    const resolveTeam = buildTeamResolver(teams);
    const unresolved = new Set<string>();
    const teamIdFor = (p: FeedPlayer) => {
      const id = resolveTeam(p.teamLabel);
      if (id === undefined) { unresolved.add(p.teamLabel ?? ''); return null; }
      return id;
    };

    const diff = diffPlayers(existing, incoming);
    const { pairs } = matchExisting(incoming, existing);
    summary.added = diff.added.length;
    summary.updated = diff.changed.length;
    summary.unchanged = diff.unchanged.length;
    summary.deactivated = diff.missing.length;
    summary.historyRows = diff.added.length + diff.changed.length;

    if (dryRun) {
      for (const p of incoming) teamIdFor(p);
      summary.unresolvedTeams = [...unresolved];
      summary.ok = true;
      await db.update(schema.syncSnapshots).set({ parsedCount: incoming.length, status: 'dry-run', errors: summary.warnings }).where(eq(schema.syncSnapshots.id, snap.id));
      return finish();
    }

    const version = maddenVersion();
    const changedIds = new Set(diff.changed.map((c) => c.existing.id));
    const now = new Date();

    await db.transaction(async (tx) => {
      const usedSlugs = new Set(existing.map((e) => e.slug));
      const history: { playerId: string; maddenVersion: string; overallRating: number; attributes: Record<string, number> }[] = [];

      for (const { incoming: p, existing: e } of pairs) {
        const fields = {
          maddenId: p.maddenId, fullName: p.fullName, firstName: p.firstName, lastName: p.lastName, position: p.position,
          teamId: teamIdFor(p), heightInches: p.heightInches, weightLbs: p.weightLbs, college: p.college,
          jerseyNumber: p.jerseyNumber, age: p.age, yearsPro: p.yearsPro, overallRating: p.overallRating,
          attributes: p.attributes, archetype: p.archetype, isActive: true, maddenVersion: version, lastSyncedAt: now,
        };
        if (e) {
          // Keep the existing slug (URLs are stable) and any image we already resolved.
          await tx.update(schema.players).set({ ...fields, imageUrl: dsql`coalesce(${schema.players.imageUrl}, ${p.imageUrl})` })
            .where(eq(schema.players.id, e.id));
          if (changedIds.has(e.id)) history.push({ playerId: e.id, maddenVersion: version, overallRating: p.overallRating, attributes: p.attributes });
        } else {
          const [row] = await tx.insert(schema.players).values({ ...fields, slug: uniqueSlug(p, usedSlugs), imageUrl: p.imageUrl })
            .returning({ id: schema.players.id });
          history.push({ playerId: row.id, maddenVersion: version, overallRating: p.overallRating, attributes: p.attributes });
        }
      }

      for (let i = 0; i < history.length; i += 500) await tx.insert(schema.maddenRatingsHistory).values(history.slice(i, i + 500));

      const missingIds = diff.missing.map((m) => m.id);
      for (let i = 0; i < missingIds.length; i += 500) {
        await tx.update(schema.players).set({ isActive: false }).where(inArray(schema.players.id, missingIds.slice(i, i + 500)));
      }

      summary.unresolvedTeams = [...unresolved];
      if (unresolved.size) summary.warnings.push(`Unresolved team labels (players set to no team): ${[...unresolved].join(', ')}`);
      await tx.update(schema.syncSnapshots).set({ parsedCount: incoming.length, status: 'success', errors: summary.warnings })
        .where(eq(schema.syncSnapshots.id, snap.id));
    });

    summary.ok = true;
    await afterCommit(summary);
    return finish();
  } catch (e) {
    const msg = (e as Error).message;
    if (!summary.errors.includes(msg)) summary.errors.unshift(msg);
    summary.ok = false;
    try {
      await db.update(schema.syncSnapshots).set({ status: 'failed', parsedCount: summary.parsed, errors: [...summary.errors, ...summary.warnings] })
        .where(eq(schema.syncSnapshots.id, snap.id));
    } catch (e2) { console.error('[sync] could not mark snapshot failed', (e2 as Error).message); }
    await notifySlack(`Ratings sync failed (snapshot ${snap.id}): ${msg}`);
    finish();
    if (throwOnError) throw new SyncError(msg, summary);
    return summary;
  }

  function finish() {
    summary.durationMs = Date.now() - started;
    return summary;
  }
}

/** Delete snapshot rows (and their files) older than the retention window. Returns rows removed. */
export async function pruneSnapshots(days = SNAPSHOT_RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const removed = await db.delete(schema.syncSnapshots).where(lt(schema.syncSnapshots.createdAt, cutoff)).returning({ id: schema.syncSnapshots.id });
  await Promise.all(removed.map((r) => unlink(path.join(snapshotDir(), `${r.id}.json`)).catch(() => {})));
  return removed.length;
}
