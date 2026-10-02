import { SITE } from '@/lib/site';
import { getMiniGame } from '@/lib/minigames/registry';
import { getResult } from '@/lib/server/leaderboard';
import { renderCard } from '@/lib/server/og/card';
import { SLOT_LABELS, type SlotResult } from '@/lib/game/seventeen';
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/game/attributes';
import type { StatLine } from '@/lib/game/build';
import { lastName } from '@/lib/names';

export const runtime = 'nodejs';

const last = lastName;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const r = await getResult(id).catch(() => null);
  let res: Response;
  if (!r) {
    res = await renderCard({ eyebrow: 'Six picks. Seventeen games.', headline: '17-0', perfect: true, lines: [], footer: 'Spin your roster' });
  } else if (r.gameType === '17-0') {
    const d = r.resultData as { wins: number; losses: number; slots: SlotResult[]; format?: string; pool?: string };
    const lines = d.slots.map((s) => ({ k: SLOT_LABELS[s.slot] ?? s.slot, v: `${last(s.name)}  ${s.letter}` }));
    const extra = [d.format === 'fantasy' ? 'Fantasy' : d.format && d.format !== '6' ? `${d.format}-man` : null, d.pool === 'all-time' ? 'All-time' : null].filter(Boolean).join(' · ');
    res = await renderCard({
      eyebrow: r.isDaily ? `Daily 17-0 · ${r.dailyDate}` : `17-0 projected record${extra ? ` · ${extra}` : ''}`, headline: `${d.wins}-${d.losses}`, perfect: d.wins === 17,
      lines: lines.length > 6 ? [...lines.slice(0, 5), { k: '+', v: `${lines.length - 5} more picks` }] : lines, footer: 'Can you beat it?',
    });
  } else if (r.gameType === '82-0') {
    const d = r.resultData as { wins: number; losses: number; slots: { slot: string; name: string; letter: string }[] };
    res = await renderCard({
      eyebrow: r.isDaily ? `Daily 82-0 · ${r.dailyDate}` : '82-0 projected record', headline: `${d.wins}-${d.losses}`, perfect: d.wins === 82,
      lines: d.slots.map((x) => ({ k: x.slot, v: `${last(x.name)}  ${x.letter}` })), footer: 'Can you beat it?',
    });
  } else if (r.gameType !== 'build-a-player') {
    const g = getMiniGame(r.gameType);
    const d = r.resultData as { summary?: string; perfect?: boolean };
    const [main, ...rest] = String(d.summary ?? '').split(' · ');
    res = await renderCard({
      eyebrow: `${g?.name ?? 'Unbeaten'}${r.isDaily ? ` · Today · ${r.dailyDate}` : ''}`, headline: main || String(r.score), perfect: !!d.perfect,
      lines: [...rest.map((x) => ({ k: 'Score', v: x })), { k: 'Game', v: g?.name ?? r.gameType }, ...(g ? [{ k: 'Play', v: `${new URL(SITE.url).host}/games/${g.slug}` }] : [])],
      footer: 'Can you beat it?',
    });
  } else {
    const d = r.resultData as { position: string; rating: number; letter: string; stats: StatLine[]; attributes: Record<string, number> };
    res = await renderCard({
      eyebrow: `Build a Player · ${d.position} · ${d.letter}`, headline: d.rating.toFixed(1), perfect: d.rating >= 95,
      lines: d.stats.map((s) => ({ k: s.label.replace('Yds/Carry x10', 'YPC'), v: s.key === 'ypc' ? (s.value / 10).toFixed(1) : s.value.toLocaleString('en-US') }))
        .concat(Object.entries(d.attributes).slice(0, 2).map(([k, v]) => ({ k: (ATTRIBUTE_LABELS[k as AttributeKey] ?? k).split(' ')[0], v: String(v) }))),
      footer: 'Build yours',
    });
  }
  res.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res;
}
