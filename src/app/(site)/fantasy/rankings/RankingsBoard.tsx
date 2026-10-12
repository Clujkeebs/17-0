'use client';
import { useEffect, useMemo, useState } from 'react';
import { FRow } from '@/components/fantasy/FRow';
import { F_POS, rankPlayers, tiers, type FPos } from '@/lib/fantasy/rank';
import type { Wide } from '@/lib/fantasy/slim';
import '@/components/fantasy/fantasy.css';

type Pos = 'ALL' | FPos;
type Sort = 'rank' | 'value' | 'recent' | 'season' | 'hot' | 'cold';
const SORTS: [Sort, string][] = [['rank', 'Rank'], ['value', 'Points per game'], ['recent', 'Last 4 games'], ['season', 'Season average'], ['hot', 'Heating up'], ['cold', 'Cooling off']];
const TEAMS = [10, 12, 14];
const PAGE = 100;

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');
/** Last four games against the season, as a share of the season. Needs both and a few games. */
const swing = (p: Pick<Wide, 'recent' | 'ppg' | 'games'>) => (p.recent != null && p.ppg != null && p.ppg > 0 && p.games >= 3 ? (p.recent - p.ppg) / p.ppg : null);

export function RankingsBoard({ players, initialPos, initialSort = 'rank' }: { players: Wide[]; initialPos: Pos; initialSort?: Sort }) {
  const [pos, setPos] = useState<Pos>(initialPos);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>(initialSort);
  const [teams, setTeams] = useState(12);
  const [superflex, setSuperflex] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  // The position rides along in the address bar, so a copied link opens the same view.
  useEffect(() => {
    const q = new URLSearchParams();
    if (pos !== 'ALL') q.set('pos', pos);
    if (sort === 'hot' || sort === 'cold') q.set('sort', sort);
    window.history.replaceState(null, '', q.size ? `?${q}` : window.location.pathname);
  }, [pos, sort]);

  const ranked = useMemo(() => rankPlayers(players, teams, superflex), [players, teams, superflex]);
  const rows = useMemo(() => {
    const inPos = ranked.filter((p) => pos === 'ALL' || p.pos === pos);
    const key = (p: (typeof ranked)[number]): number | null => sort === 'recent' ? p.recent : sort === 'season' ? p.ppg : sort === 'hot' ? swing(p) : sort === 'cold' ? (swing(p) == null ? null : -swing(p)!) : sort === 'value' ? p.value : null;
    const sorted = sort === 'rank'
      ? [...inPos].sort((a, b) => (pos === 'ALL' ? a.overall - b.overall : a.posRank - b.posRank))
      : [...inPos].filter((p) => key(p) != null).sort((a, b) => key(b)! - key(a)!);
    // Tiers follow the drops in the full list, so a search does not renumber them.
    const t = sort === 'rank' ? tiers(sorted.map((p) => (pos === 'ALL' ? p.vor : p.value))) : [];
    const needle = norm(q).trim();
    return sorted.map((p, i) => ({ p, tier: t[i] ?? 0 })).filter(({ p }) => !needle || norm(p.name).includes(needle) || p.team.toLowerCase() === needle);
  }, [ranked, pos, sort, q]);

  const shown = rows.slice(0, limit);
  const title = pos === 'ALL' ? 'Overall rankings' : `${pos} rankings`;

  return (
    <>
      <h1>{title}</h1>
      <p className="muted">PPR points per game. L4 is the last four games, Szn the season average. Overall order is value over a replacement starter in a {teams}-team league{superflex ? ' with superflex' : ''}.</p>

      <div className="fr-bar">
        <input type="search" aria-label="Search players" placeholder="Search players or a team" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
        <label className="fr-sort">
          <span className="trade-set-label">Sort</span>
          <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setLimit(PAGE); }}>
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>
      <div className="fr-bar fr-bar-2">
        <span className="md-pos-tabs" role="group" aria-label="Position">
          {(['ALL', ...F_POS] as const).map((p) => <button key={p} type="button" className={`lb-chip${pos === p ? ' on' : ''}`} aria-pressed={pos === p} onClick={() => { setPos(p); setLimit(PAGE); }}>{p === 'ALL' ? 'All' : p}</button>)}
        </span>
        <span className="seg" role="radiogroup" aria-label="League size">
          {TEAMS.map((n) => <button key={n} type="button" role="radio" aria-checked={teams === n} className={teams === n ? 'on' : ''} onClick={() => setTeams(n)}>{n} teams</button>)}
        </span>
        <label className="trade-toggle"><input type="checkbox" checked={superflex} onChange={(e) => setSuperflex(e.target.checked)} /> Superflex</label>
      </div>

      {shown.length ? (
        <ol className="f-list fr-list">
          {shown.map(({ p, tier }, i) => {
            const s = swing(p);
            const newTier = sort === 'rank' && (i === 0 || tier !== shown[i - 1].tier);
            return (
              <FRowItem key={p.id} newTier={newTier} tier={tier}>
                <FRow p={p} rank={sort === 'rank' ? (pos === 'ALL' ? p.overall : p.posRank) : i + 1}
                  note={s != null && Math.abs(s) >= 0.2 ? <span className={s > 0 ? 'fr-hot' : 'fr-cold'}>{s > 0 ? '▲ Hot' : '▼ Cold'} <span className="muted">{s > 0 ? '+' : ''}{Math.round(s * 100)}%</span></span> : undefined} />
              </FRowItem>
            );
          })}
        </ol>
      ) : <p className="muted fr-none">{sort === 'hot' || sort === 'cold' || sort === 'recent' ? 'No one has enough games for that yet.' : 'No players match.'}</p>}
      {rows.length > limit && <button type="button" className="btn fr-more" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more</button>}
    </>
  );
}

/** An optional tier heading before a row. Both are list items so the list stays valid. */
function FRowItem({ newTier, tier, children }: { newTier: boolean; tier: number; children: React.ReactNode }) {
  return (
    <>
      {newTier && <li className="fr-tier" aria-label={`Tier ${tier}`}><span>Tier {tier}</span></li>}
      {children}
    </>
  );
}
