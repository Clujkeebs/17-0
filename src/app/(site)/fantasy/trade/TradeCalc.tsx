'use client';
import { useEffect, useMemo, useState } from 'react';
import { PlayerPicker } from '@/components/fantasy/PlayerPicker';
import { PlayerFace } from '@/components/game/PlayerFace';
import { balancers, evaluateTrade, replacementLevels, EXTRA_WEIGHT, type League, type TradeLine } from '@/lib/fantasy/rank';
import type { Slim } from '@/lib/fantasy/slim';

const TEAMS = [10, 12, 14];

function Side({ title, list, lines, players, others, set }: { title: string; list: Slim[]; lines: TradeLine[]; players: Slim[]; others: string[]; set: (l: Slim[]) => void }) {
  const line = (id: string) => lines.find((l) => l.id === id);
  return (
    <section className="card" aria-label={title}>
      <h2 style={{ fontSize: '1.15rem', margin: '0 0 12px' }}>{title}</h2>
      <PlayerPicker players={players} label={`Add to ${title.toLowerCase()}`} exclude={[...others, ...list.map((p) => p.id)]} onPick={(p) => set([...list, p])} />
      <ul className="trade-list">
        {list.map((p) => {
          const l = line(p.id);
          return (
            <li key={p.id}>
              <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={36} />
              <span className="trade-who"><strong>{p.name}</strong><span className="muted">{p.pos}{p.posRank} · {p.team}</span>
                {l && l.weight < 1 && <span className="trade-note">Counts half: extra roster spot</span>}</span>
              <span className="num trade-val" title="Trade value">{l ? (l.value * l.weight).toFixed(1) : ''}</span>
              <button type="button" className="trade-x" onClick={() => set(list.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.name}`}>×</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Reads a shared trade from the address bar: ?give=id,id&get=id&teams=12&sf=1. */
function fromUrl(players: Slim[]) {
  const q = new URLSearchParams(window.location.search);
  const ids = (k: string) => (q.get(k) ?? '').split(',').map((id) => players.find((p) => p.id === id)).filter((p): p is Slim => !!p);
  const teams = Number(q.get('teams'));
  return { give: ids('give'), get: ids('get'), league: { teams: TEAMS.includes(teams) ? teams : 12, superflex: q.get('sf') === '1' } };
}

export function TradeCalc({ players }: { players: Slim[] }) {
  const [give, setGive] = useState<Slim[]>([]);
  const [get, setGet] = useState<Slim[]>([]);
  const [league, setLeague] = useState<League>({ teams: 12, superflex: false });
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Open a shared link with its trade and league already filled in.
  useEffect(() => {
    const s = fromUrl(players);
    setGive(s.give); setGet(s.get); setLeague(s.league); setLoaded(true);
  }, [players]);
  // Keep the address bar in step, so copying it shares this exact trade.
  useEffect(() => {
    if (!loaded) return;
    const q = new URLSearchParams();
    if (give.length) q.set('give', give.map((p) => p.id).join(','));
    if (get.length) q.set('get', get.map((p) => p.id).join(','));
    if (league.teams !== 12) q.set('teams', String(league.teams));
    if (league.superflex) q.set('sf', '1');
    const s = q.toString();
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
  }, [give, get, league, loaded]);

  const repl = useMemo(() => replacementLevels(players, league), [players, league]);
  const v = give.length && get.length ? evaluateTrade(give, get, repl) : null;
  const fix = v ? balancers(players.slice(0, 300), give, get, repl) : null;

  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }

  return (
    <>
      <div className="trade-settings" role="group" aria-label="League settings">
        <span className="trade-set-label">League</span>
        <span className="seg" role="radiogroup" aria-label="Teams">
          {TEAMS.map((n) => <button key={n} type="button" role="radio" aria-checked={league.teams === n} className={league.teams === n ? 'on' : ''} onClick={() => setLeague({ ...league, teams: n })}>{n} teams</button>)}
        </span>
        <label className="trade-toggle"><input type="checkbox" checked={league.superflex} onChange={(e) => setLeague({ ...league, superflex: e.target.checked })} /> Superflex</label>
        <span className="muted trade-set-note">PPR scoring</span>
      </div>
      <div className="trade-grid">
        <Side title="You give" list={give} lines={v?.giveLines ?? []} players={players} others={get.map((p) => p.id)} set={setGive} />
        <Side title="You get" list={get} lines={v?.getLines ?? []} players={players} others={give.map((p) => p.id)} set={setGet} />
      </div>
      <div className="card trade-verdict" aria-live="polite">
        {v ? (
          <>
            <p className="big-num" style={{ margin: 0, color: v.verdict === 'You lose it' ? 'var(--danger)' : undefined }}>{v.verdict}</p>
            <div className="trade-bar" aria-hidden="true"><span style={{ width: `${(v.give / (v.give + v.get || 1)) * 100}%` }} /></div>
            <p className="muted" style={{ margin: '6px 0 0' }}>You give <strong className="num">{v.give}</strong>, you get <strong className="num">{v.get}</strong>{v.verdict !== 'Fair' ? `, a ${v.pct} percent gap` : ''}.</p>
            {fix && fix.players.length > 0 && (
              <div className="trade-fix">
                <p style={{ margin: '14px 0 8px', fontWeight: 600 }}>{fix.side === 'get' ? 'To even it out, ask for one more:' : 'To make it fair for them, add one of yours:'}</p>
                <div className="m-row">
                  {fix.players.map((p) => (
                    <button key={p.id} type="button" className="trade-chip" onClick={() => (fix.side === 'get' ? setGet([...get, p]) : setGive([...give, p]))}>
                      + {p.name} <span className="muted">{p.pos}{p.posRank}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="btn" style={{ marginTop: 16 }} onClick={copy}>{copied ? 'Link copied' : 'Copy link to this trade'}</button>
          </>
        ) : <p className="muted" style={{ margin: 0 }}>Add at least one player to each side.</p>}
      </div>
      <details className="m-how" style={{ marginTop: 20 }}>
        <summary>How the values work</summary>
        <p>Each player is worth his PPR points per game (recent games count most) minus what a free replacement at his position scores in your league: the last starter at that spot across all teams. A bigger league or superflex raises the bar, so stars and quarterbacks gain value.</p>
        <p>In an uneven trade, the extra players in the bigger package count at {EXTRA_WEIGHT * 100} percent, because each one takes a roster spot someone has to clear. Within 10 percent is called fair. Injuries and bye weeks are not counted, so adjust for those yourself.</p>
      </details>
    </>
  );
}
