'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KIND_LABELS, KIND_ORDER, RARITY_LABEL, SHOP_ITEMS, itemsOf, rarity, shopItem, type ItemKind, type Rarity, type ShopItem } from '@/lib/shop';
import { clock } from '@/lib/drops';
import { claimDrop, useActiveDrop, useSecondsLeft } from '@/components/drops/useActiveDrop';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';
import '@/components/shop.css';

type Equipped = { font: string; color: string; border: string | null; banner: string | null; title: string | null; flair: string | null; effect: string | null };
type Sort = 'price' | 'rarest' | 'owned';
const RANK: Record<Rarity, number> = { exclusive: 7, drop: 6, gift: 5, limited: 4, legendary: 3, epic: 2, rare: 1, common: 0 };

/** Asks the browser for permission to show a system notification when a drop lands (works while a tab is open). */
function NotifyToggle() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported' | null>(null);
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission); }, []);
  if (perm === null || perm === 'unsupported') return null;
  if (perm === 'granted') return <span className="sd-notify on">Alerts are on while Unbeaten is open</span>;
  if (perm === 'denied') return <span className="sd-notify muted">Alerts are blocked in this browser</span>;
  return <button type="button" className="btn btn-sm" onClick={() => { void Notification.requestPermission().then(setPerm); }}>Alert me when one lands</button>;
}

export function ShopClient({ signedIn, points, owned, sold, name, image, equipped, owner }: {
  signedIn: boolean; points: number; owned: string[]; sold: Record<string, number>; name: string; image: string | null; equipped: Equipped | null; owner: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ItemKind>('effect');
  const [sort, setSort] = useState<Sort>('price');
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const live = useActiveDrop();
  const liveDrop = live?.drop ?? null;
  const liveItem = liveDrop ? shopItem(liveDrop.itemKey) : undefined;
  const dropLeft = useSecondsLeft(liveDrop, live?.skew ?? 0);
  const have = new Set(owned);
  const base = equipped ?? { font: 'classic', color: 'ink', border: null, banner: null, title: null, flair: null, effect: null };

  async function post(body: object, key: string, okText: string) {
    setBusy(key); setMsg(null);
    try {
      const res = await fetch('/api/shop', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Something went wrong.');
      setMsg({ ok: true, text: okText });
      setTrying(null);
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  }

  const isOn = (i: ShopItem) => (i.kind === 'font' ? base.font : i.kind === 'color' ? base.color : base[i.kind]) === i.key;
  const withItem = (i: ShopItem | null) => ({ ...base, owner: false, ...(i ? { [i.kind]: i.key } : {}) }) as Equipped & { owner: boolean };
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

  // Owner exclusives show only to the owner; gifts only to whoever was given them.
  const visible = (i: ShopItem) => (!i.ownerOnly || owner) && (!i.giftOnly || have.has(i.key)) && (!i.dropOnly || have.has(i.key));
  const dropItems = SHOP_ITEMS.filter((i) => i.dropOnly);
  async function claimLive() {
    if (!liveDrop) return;
    setClaiming(true); setMsg(null);
    try { const out = await claimDrop(liveDrop.id); setMsg({ ok: true, text: `${out.label} is yours. Equip it any time.` }); router.refresh(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setClaiming(false); }
  }
  const gotDrops = dropItems.filter((i) => have.has(i.key)).length;
  const dropOpen = !!liveDrop && !!liveItem && !live?.owned && (dropLeft ?? 1) > 0;
  const list = itemsOf(kind).filter(visible);
  const items = [...list].sort((a, b) =>
    sort === 'rarest' ? RANK[rarity(b)] - RANK[rarity(a)] || b.price - a.price
      : sort === 'owned' ? Number(have.has(b.key)) - Number(have.has(a.key)) || a.price - b.price
        : a.price - b.price);
  const ownedIn = (k: ItemKind) => itemsOf(k).filter((i) => visible(i) && have.has(i.key)).length;
  const countIn = (k: ItemKind) => itemsOf(k).filter(visible).length;

  return (
    <div className="shop-scope">
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
      <div className="shop-sort" role="group" aria-label="Sort">
        {([['price', 'Cheapest first'], ['rarest', 'Rarest first'], ['owned', 'Owned first']] as const).map(([k, l]) => (
          <button key={k} type="button" className={`btn btn-sm${sort === k ? ' btn-primary' : ''}`} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
        ))}
      </div>
      <div aria-live="polite">{msg && <p className={msg.ok ? 'hint' : 'field-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}</div>
      <ul className="shop-grid">
        {items.map((i) => {
          const mine = have.has(i.key);
          const left = i.limit ? Math.max(0, i.limit - (sold[i.key] ?? 0)) : null;
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
                  {mine && !i.ownerOnly && <span className="shop-tag owned">{i.giftOnly ? 'Gifted to you' : i.dropOnly ? 'From a drop' : 'Owned'}</span>}
                </span>
                {i.blurb && <span className="muted shop-blurb">{i.blurb}</span>}
              </div>
              <div className="shop-act">
                {mine ? (
                  on ? <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => post({ action: 'equip', kind: i.kind, item: null }, i.key, 'Unequipped.')}>Equipped · remove</button>
                    : <button type="button" className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => post({ action: 'equip', kind: i.kind, item: i.key }, i.key, `${i.label} equipped.`)}>Equip</button>
                ) : (
                  <button type="button" className="btn btn-sm btn-primary" disabled={!signedIn || !!busy || left === 0 || points < i.price}
                    onClick={() => post({ action: 'buy', item: i.key }, i.key, `${i.label} is yours. Equip it any time.`)}>
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
