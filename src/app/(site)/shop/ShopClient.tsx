'use client';
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KIND_LABELS, KIND_ORDER, RARITY_LABEL, SHOP_ITEMS, itemsOf, rarity, shopItem, type ItemKind, type Rarity, type ShopItem } from '@/lib/shop';
import { clock } from '@/lib/drops';
import { claimDrop, useActiveDrop, useSecondsLeft } from '@/components/drops/useActiveDrop';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';
import { MotionToggle } from '@/components/Motion';
import '@/components/shop.css';

type Equipped = { font: string; color: string; border: string | null; banner: string | null; title: string | null; flair: string | null; effect: string | null };
type Sort = 'price' | 'rarest' | 'owned';
type Filter = 'all' | 'owned' | 'not-owned';
const RANK: Record<Rarity, number> = { exclusive: 7, drop: 6, gift: 5, limited: 4, legendary: 3, epic: 2, rare: 1, common: 0, free: -1 };
/** What a slot falls back to when nothing is equipped: the free basics. */
const DEFAULTS: Equipped = { font: 'classic', color: 'ink', border: 'ring-plain', banner: 'banner-plain', title: null, flair: null, effect: null };

/** Asks the browser for permission to show a system notification when a drop lands (works while a tab is open). */
function NotifyToggle() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported' | null>(null);
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission); }, []);
  if (perm === null || perm === 'unsupported') return null;
  if (perm === 'granted') return <span className="sd-notify on">Alerts are on while Unbeaten is open</span>;
  if (perm === 'denied') return <span className="sd-notify muted">Alerts are blocked in this browser</span>;
  return <button type="button" className="btn btn-sm" onClick={() => { void Notification.requestPermission().then(setPerm); }}>Alert me when one lands</button>;
}

export function ShopClient({ signedIn, points, earned, owned, sold, name, image, equipped, owner }: {
  signedIn: boolean; points: number; earned: number; owned: string[]; sold: Record<string, number>; name: string; image: string | null; equipped: Equipped | null; owner: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [kind, setKind] = useState<ItemKind>('effect');
  const [sort, setSort] = useState<Sort>('price');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim().toLowerCase());
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  // What the page shows is kept here and updated the moment a buy or equip succeeds, so nothing reloads or flickers;
  // the server's own copy is refreshed in the background and wins whenever it arrives.
  const [pts, setPts] = useState(points);
  const [have, setHave] = useState(() => new Set(owned));
  const [soldMap, setSoldMap] = useState(sold);
  const [worn, setWorn] = useState<Equipped>(equipped ?? DEFAULTS);
  useEffect(() => { setPts(points); setHave(new Set(owned)); setSoldMap(sold); setWorn(equipped ?? DEFAULTS); }, [points, owned, sold, equipped]);
  const live = useActiveDrop();
  const liveDrop = live?.drop ?? null;
  const liveItem = liveDrop ? shopItem(liveDrop.itemKey) : undefined;
  const dropLeft = useSecondsLeft(liveDrop, live?.skew ?? 0);

  async function post(body: object, key: string, okText: string, after: (d: { points?: number }) => void) {
    setBusy(key); setMsg(null);
    try {
      const res = await fetch('/api/shop', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Something went wrong.');
      after(d);
      setMsg({ ok: true, text: okText });
      setTrying(null);
      startTransition(() => router.refresh());
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  }
  const buyItem = (i: ShopItem) => post({ action: 'buy', item: i.key }, i.key, `${i.label} is yours. Equip it any time.`, (d) => {
    setHave((h) => new Set(h).add(i.key));
    setPts((p) => d.points ?? p - i.price);
    if (i.limit) setSoldMap((s) => ({ ...s, [i.key]: (s[i.key] ?? 0) + 1 }));
  });
  const equipItem = (kindOf: ItemKind, item: string | null, label: string) => post({ action: 'equip', kind: kindOf, item }, `${kindOf}:${item ?? 'none'}`, item ? `${label} equipped.` : 'Back to the basics.', () => {
    setWorn((w) => ({ ...w, [kindOf]: item ?? DEFAULTS[kindOf] }));
  });

  const isOn = (i: ShopItem) => worn[i.kind] === i.key;
  const withItem = (i: ShopItem | null) => ({ ...worn, owner: false, ...(i ? { [i.kind]: i.key } : {}) }) as Equipped & { owner: boolean };
  // Every card shows only its own item on a plain name and picture, so the cards compare like for like.
  // The look bar above shows the item on you, together with everything else you wear.
  const plain = { font: 'classic', color: 'ink', owner: false };
  const preview = (i: ShopItem) => {
    if (i.kind === 'border') return <Avatar name={name} src={image} size={64} ring={i.key} />;
    if (i.kind === 'effect') return <Avatar name={name} src={image} size={64} effect={i.key} />;
    const s = { ...plain, [i.kind === 'font' ? 'font' : i.kind === 'color' ? 'color' : i.kind]: i.key };
    if (i.kind === 'banner') return <div className={`banner ${i.key} shop-banner`}><StyledName name={name} style={s} showTitle={false} /></div>;
    return <span className="shop-name"><StyledName name={name} style={s} showTitle={i.kind === 'title'} /></span>;
  };
  const look = withItem(trying);

  // Owner exclusives show only to the owner; gifts and drops only to whoever has them.
  const visible = (i: ShopItem) => (!i.ownerOnly || owner) && (!i.giftOnly || have.has(i.key)) && (!i.dropOnly || have.has(i.key));
  const dropItems = SHOP_ITEMS.filter((i) => i.dropOnly);
  async function claimLive() {
    if (!liveDrop) return;
    setClaiming(true); setMsg(null);
    try {
      const out = await claimDrop(liveDrop.id);
      setHave((h) => new Set(h).add(liveDrop.itemKey));
      setMsg({ ok: true, text: `${out.label} is yours. Equip it any time.` });
      startTransition(() => router.refresh());
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setClaiming(false); }
  }
  const gotDrops = dropItems.filter((i) => have.has(i.key)).length;
  const dropOpen = !!liveDrop && !!liveItem && !live?.owned && (dropLeft ?? 1) > 0;

  const items = useMemo(() => {
    const list = itemsOf(kind).filter(visible)
      .filter((i) => (filter === 'owned' ? have.has(i.key) : filter === 'not-owned' ? !have.has(i.key) : true))
      .filter((i) => !q || i.label.toLowerCase().includes(q) || (i.blurb ?? '').toLowerCase().includes(q));
    return [...list].sort((a, b) =>
      sort === 'rarest' ? RANK[rarity(b)] - RANK[rarity(a)] || b.price - a.price
        : sort === 'owned' ? Number(have.has(b.key)) - Number(have.has(a.key)) || a.price - b.price
          : a.price - b.price || a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, filter, q, sort, have, owner]);
  const ownedIn = (k: ItemKind) => itemsOf(k).filter((i) => visible(i) && have.has(i.key)).length;
  const countIn = (k: ItemKind) => itemsOf(k).filter(visible).length;

  const basics: { id: string; label: string; kind: ItemKind; item: ShopItem | null; on: boolean }[] = [
    { id: 'ring-plain', label: 'Plain ring', kind: 'border', item: shopItem('ring-plain') ?? null, on: worn.border === 'ring-plain' },
    { id: 'banner-plain', label: 'Plain banner', kind: 'banner', item: shopItem('banner-plain') ?? null, on: worn.banner === 'banner-plain' },
    { id: 'font-classic', label: 'Classic font', kind: 'font', item: null, on: worn.font === 'classic' },
    { id: 'color-ink', label: 'Ink color', kind: 'color', item: null, on: worn.color === 'ink' },
  ];
  const basicPreview = (b: (typeof basics)[number]) => (b.item ? preview(b.item) : <span className="shop-name"><StyledName name={name} style={plain} showTitle={false} /></span>);

  return (
    <div className="shop-scope">
      <div className="shop-top">
        {signedIn && (
          <p className="row" style={{ gap: 10, margin: 0 }}>
            <span className="pts-pill num" data-testid="balance">{pts.toLocaleString('en-US')} pts</span>
            <span className="muted">{earned.toLocaleString('en-US')} earned all time</span>
          </p>
        )}
        <MotionToggle />
      </div>

      <section id="drops" className={`shop-drops${dropOpen ? ' live' : ''}`} aria-labelledby="drops-h">
        <div className="sd-top">
          <div>
            <h2 id="drops-h">Free drops</h2>
            <p className="muted sd-sub">{dropItems.length} items you cannot buy. One lands at random every few days and stays for ten minutes. Claim it and it is yours for good.</p>
          </div>
          <NotifyToggle />
        </div>
        {dropOpen && liveItem && liveDrop && (
          <div className="sd-live" role="status">
            <button type="button" className="shop-prev-btn" aria-label={`Try on ${liveItem.label}`} aria-pressed={trying?.key === liveItem.key} onClick={() => setTrying(trying?.key === liveItem.key ? null : liveItem)}>{preview(liveItem)}</button>
            <div className="sd-live-text">
              <p className="eyebrow">Live now</p>
              <h3>{liveItem.label}</h3>
              <p className="muted">{KIND_LABELS[liveItem.kind]}. {liveItem.blurb?.replace('Drop exclusive. ', '')}</p>
            </div>
            <div className="sd-live-act">
              <span className="sd-clock num" role="timer" aria-label={`${Math.ceil((dropLeft ?? 0) / 60)} minutes left`}>{clock(dropLeft ?? 0)}</span>
              {signedIn
                ? <button type="button" className="btn btn-primary" disabled={claiming} onClick={claimLive}>{claiming ? 'Claiming' : 'Claim free'}</button>
                : <Link className="btn btn-primary" href="/login?next=/shop%23drops">Sign in to claim</Link>}
            </div>
          </div>
        )}
        <ul className="sd-grid">
          {dropItems.map((i) => {
            const got = have.has(i.key);
            return (
              <li key={i.key} className={`sd-tile k-${i.kind}${got ? ' got' : ''}`}>
                <button type="button" className="shop-prev-btn" aria-label={`Try on ${i.label}`} aria-pressed={trying?.key === i.key} onClick={() => setTrying(trying?.key === i.key ? null : i)}>{preview(i)}</button>
                <strong>{i.label}</strong>
                <span className="muted">{KIND_LABELS[i.kind]}</span>
                <span className={`shop-tag r-drop${got ? ' got' : ''}`}>{got ? 'Yours' : 'Drop only'}</span>
              </li>
            );
          })}
        </ul>
        <p className="muted sd-foot">{dropOpen ? '' : 'No drop right now. The next one comes without warning. '}You have {gotDrops} of {dropItems.length}.</p>
      </section>

      <section className="shop-basics" aria-labelledby="basics-h">
        <h2 id="basics-h">The basics</h2>
        <p className="muted">Free for everyone, always yours. Wear one to go back to plain.</p>
        <ul className="basics-grid">
          {basics.map((b) => (
            <li key={b.id} className={`basic-card k-${b.kind}${b.on ? ' on' : ''}`}>
              <button type="button" className="shop-prev-btn" aria-label={`Try on ${b.label}`} onClick={() => b.item && setTrying(trying?.key === b.item.key ? null : b.item)}>{basicPreview(b)}</button>
              <strong>{b.label}</strong>
              {signedIn
                ? b.on ? <span className="shop-tag owned">Wearing</span>
                  : <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => equipItem(b.kind, b.item?.key ?? null, b.label)}>Wear</button>
                : <span className="shop-tag r-free">Free</span>}
            </li>
          ))}
        </ul>
      </section>

      <div className={`shop-look${look.banner ? ` banner ${look.banner}` : ''}`} aria-label="Your look">
        <Avatar name={name} src={image} size={44} ring={look.border} effect={look.effect} />
        <span className="shop-look-name"><StyledName name={name} style={look} /></span>
        <span className={`shop-look-meta${trying ? '' : ' idle'}`}>
          {trying ? <><span>Trying on {trying.label}</span><button type="button" className="btn btn-sm" onClick={() => setTrying(null)}>Back to mine</button></>
            : <span className="muted">Tap any preview to try it on</span>}
        </span>
      </div>

      <nav className="lb-games" aria-label="Item type" style={{ marginTop: 12 }}>
        {KIND_ORDER.map((k) => (
          <button key={k} type="button" className={`lb-chip${k === kind ? ' on' : ''}`} aria-pressed={k === kind} onClick={() => setKind(k)}>
            {KIND_LABELS[k]}{signedIn && <span className="shop-count num">{ownedIn(k)}/{countIn(k)}</span>}
          </button>
        ))}
      </nav>
      <div className="shop-tools">
        <div className="shop-sort" role="group" aria-label="Sort">
          {([['price', 'Cheapest first'], ['rarest', 'Rarest first'], ['owned', 'Owned first']] as const).map(([k, l]) => (
            <button key={k} type="button" className={`btn btn-sm${sort === k ? ' btn-primary' : ''}`} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
        {signedIn && (
          <div className="shop-sort" role="group" aria-label="Show">
            {([['all', 'All'], ['owned', 'Owned'], ['not-owned', 'Not owned']] as const).map(([k, l]) => (
              <button key={k} type="button" className={`btn btn-sm${filter === k ? ' btn-primary' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor="shop-q">Search this tab</label>
        <input id="shop-q" className="shop-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${KIND_LABELS[kind].toLowerCase()}`} autoComplete="off" />
      </div>
      <div aria-live="polite">{msg && <p className={msg.ok ? 'hint' : 'field-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}</div>
      {!items.length && <p className="muted" style={{ margin: '20px 0' }}>Nothing here{q ? ` for "${query.trim()}"` : filter !== 'all' ? ' with that filter' : ''}.</p>}
      <ul className="shop-grid">
        {items.map((i) => {
          const mine = have.has(i.key);
          const left = i.limit ? Math.max(0, i.limit - (soldMap[i.key] ?? 0)) : null;
          const on = isOn(i);
          const r = rarity(i);
          return (
            <li key={i.key} className={`shop-card k-${i.kind} r-${r}${trying?.key === i.key ? ' trying' : ''}`}>
              <button type="button" className="shop-prev-btn" aria-label={`Try on ${i.label}`} aria-pressed={trying?.key === i.key}
                onClick={() => setTrying(trying?.key === i.key ? null : i)}>{preview(i)}</button>
              <div className="shop-meta">
                <strong>{i.label}</strong>
                <span className="shop-tags">
                  <span className={`shop-tag r-${r}`}>{RARITY_LABEL[r]}</span>
                  {left !== null && !i.ownerOnly && <span className="shop-tag stock">{left === 0 ? 'Sold out' : `${left} of ${i.limit} left`}</span>}
                  {mine && !i.ownerOnly && !i.free && <span className="shop-tag owned">{i.giftOnly ? 'Gifted to you' : i.dropOnly ? 'From a drop' : 'Owned'}</span>}
                </span>
                {i.blurb && <span className="muted shop-blurb">{i.blurb}</span>}
              </div>
              <div className="shop-act">
                {mine ? (
                  on ? (i.free ? <button type="button" className="btn btn-sm" disabled>Wearing</button>
                    : <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => equipItem(i.kind, null, i.label)}>Equipped · remove</button>)
                    : <button type="button" className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => equipItem(i.kind, i.key, i.label)}>Equip</button>
                ) : (
                  <button type="button" className="btn btn-sm btn-primary" disabled={!signedIn || !!busy || left === 0 || pts < i.price} onClick={() => buyItem(i)}>
                    {left === 0 ? 'Sold out' : `${i.price.toLocaleString('en-US')} pts`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
