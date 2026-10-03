'use client';
import { useEffect, useState } from 'react';
import { SHOP_ITEMS } from '@/lib/shop';

type Stats = { gamesToday: number; activeNow: number; signupsToday: number; players: number; pointsHeld: number; topGames: { game: string; n: number }[]; challengesToday?: number; challengeEntriesToday?: number };

/** Owner tools: live numbers, a site banner, and player tools (points, items, leaderboard moderation, replays). */
export function OwnerTools({ games }: { games: { slug: string; name: string }[] }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [user, setUser] = useState('');
  const [amount, setAmount] = useState('100');
  const [item, setItem] = useState(SHOP_ITEMS.find((i) => !i.ownerOnly)!.key);
  const [game, setGame] = useState(games[0]?.slug ?? '17-0');
  const [banner, setBanner] = useState('');

  async function call(body: object, label: string) {
    setBusy(label); setMsg(null);
    try {
      const r = await fetch('/api/owner/manage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'That did not work.');
      if (d.stats) setStats(d.stats); else setMsg({ ok: true, text: d.message });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(''); }
  }
  useEffect(() => { void call({ action: 'stats' }, 'stats'); }, []);
  const need = !user.trim();

  return (
    <section style={{ marginTop: 40 }}>
      <h2>Live</h2>
      <div className="row" style={{ gap: 28 }}>
        {stats ? (
          <>
            <div className="stat"><span className="v num">{stats.activeNow}</span><span className="l">Playing now</span></div>
            <div className="stat"><span className="v num">{stats.gamesToday}</span><span className="l">Games today</span></div>
            <div className="stat"><span className="v num">{stats.signupsToday}</span><span className="l">Sign-ups today</span></div>
            <div className="stat"><span className="v num">{stats.challengesToday ?? 0}</span><span className="l">Challenges today</span></div>
            <div className="stat"><span className="v num">{stats.challengeEntriesToday ?? 0}</span><span className="l">Challenge plays today</span></div>
            <div className="stat"><span className="v num">{stats.players}</span><span className="l">Accounts</span></div>
            <div className="stat"><span className="v num">{stats.pointsHeld.toLocaleString('en-US')}</span><span className="l">Points held</span></div>
          </>
        ) : <div className="skeleton" style={{ height: 56, width: 320 }} />}
        <button type="button" className="btn btn-sm" onClick={() => call({ action: 'stats' }, 'stats')} disabled={!!busy}>Refresh</button>
      </div>
      {stats && stats.topGames.length > 0 && <p className="muted">Most played today: {stats.topGames.map((g) => `${g.game} (${g.n})`).join(', ')}</p>}

      <div aria-live="polite">{msg && <p className={msg.ok ? 'hint' : 'field-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}</div>

      <h2 style={{ marginTop: 32 }}>Site banner</h2>
      <div className="card">
        <label htmlFor="ot-banner">Message across the top of every page</label>
        <input id="ot-banner" type="text" maxLength={160} value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="New game: Sports Connections is live" />
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={!!busy || !banner.trim()} onClick={() => call({ action: 'banner', text: banner }, 'banner')}>Put it up</button>
          <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => call({ action: 'banner', text: null }, 'banner')}>Take it down</button>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Players</h2>
      <div className="card owner-tools">
        <label htmlFor="ot-user">Username</label>
        <input id="ot-user" type="text" maxLength={40} value={user} onChange={(e) => setUser(e.target.value)} placeholder="@username" autoComplete="off" />
        <div className="ot-row">
          <label htmlFor="ot-amt" className="sr-only">Points</label>
          <input id="ot-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ maxWidth: 120 }} />
          <button type="button" className="btn btn-sm btn-primary" disabled={!!busy || need || !Number(amount)} onClick={() => call({ action: 'points', username: user.trim(), amount: Math.trunc(Number(amount)) }, 'points')}>Give points</button>
          <span className="muted" style={{ fontSize: '.85rem' }}>A negative number takes points away.</span>
        </div>
        <div className="ot-row">
          <label htmlFor="ot-item" className="sr-only">Item</label>
          <select id="ot-item" value={item} onChange={(e) => setItem(e.target.value)}>
            {SHOP_ITEMS.filter((i) => !i.ownerOnly).map((i) => <option key={i.key} value={i.key}>{i.label} ({i.kind}{i.limit ? `, limited ${i.limit}` : ''})</option>)}
          </select>
          <button type="button" className="btn btn-sm" disabled={!!busy || need} onClick={() => call({ action: 'item', username: user.trim(), item }, 'item')}>Give item</button>
        </div>
        <div className="ot-row">
          <button type="button" className="btn btn-sm" disabled={!!busy || need} onClick={() => call({ action: 'hide', username: user.trim(), hidden: true }, 'hide')}>Hide from leaderboards</button>
          <button type="button" className="btn btn-sm" disabled={!!busy || need} onClick={() => call({ action: 'hide', username: user.trim(), hidden: false }, 'hide')}>Show again</button>
        </div>
        <div className="ot-row">
          <label htmlFor="ot-game" className="sr-only">Game</label>
          <select id="ot-game" value={game} onChange={(e) => setGame(e.target.value)}>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
          <button type="button" className="btn btn-sm" disabled={!!busy || need} onClick={() => { if (window.confirm(`Clear ${user}'s ranked ${game} result for today?`)) void call({ action: 'reset-today', username: user.trim(), game }, 'reset'); }}>Let them replay today</button>
        </div>
      </div>
    </section>
  );
}
