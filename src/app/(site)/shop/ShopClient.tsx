'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KIND_LABELS, KIND_ORDER, RARITY_LABEL, itemsOf, rarity, type ItemKind, type Rarity, type ShopItem } from '@/lib/shop';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';

type Equipped = { font: string; color: string; border: string | null; banner: string | null; title: string | null; flair: string | null };
type Sort = 'price' | 'rarest' | 'owned';
const RANK: Record<Rarity, number> = { exclusive: 5, limited: 4, legendary: 3, epic: 2, rare: 1, common: 0 };

export function ShopClient({ signedIn, points, owned, sold, name, image, equipped, owner }: {
  signedIn: boolean; points: number; owned: string[]; sold: Record<string, number>; name: string; image: string | null; equipped: Equipped | null; owner: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ItemKind>('color');
  const [sort, setSort] = useState<Sort>('price');
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const have = new Set(owned);
  const base = equipped ?? { font: 'classic', color: 'ink', border: null, banner: null, title: null, flair: null };

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
  const preview = (i: ShopItem) => {
    const s = withItem(i);
    if (i.kind === 'border') return <Avatar name={name} src={image} size={56} ring={i.key} />;
    if (i.kind === 'banner') return <div className={`banner ${i.key} shop-banner`}><StyledName name={name} style={s} showTitle={false} /></div>;
    return <span className="shop-name"><StyledName name={name} style={s} showTitle={i.kind === 'title'} /></span>;
  };
  const look = withItem(trying);

  const list = itemsOf(kind).filter((i) => !i.ownerOnly || owner);
  const items = [...list].sort((a, b) =>
    sort === 'rarest' ? RANK[rarity(b)] - RANK[rarity(a)] || b.price - a.price
      : sort === 'owned' ? Number(have.has(b.key)) - Number(have.has(a.key)) || a.price - b.price
        : a.price - b.price);
  const ownedIn = (k: ItemKind) => itemsOf(k).filter((i) => (!i.ownerOnly || owner) && have.has(i.key)).length;
  const countIn = (k: ItemKind) => itemsOf(k).filter((i) => !i.ownerOnly || owner).length;

  return (
    <>
      <div className={`shop-look${look.banner ? ` banner ${look.banner}` : ''}`} aria-label="Your look">
        <Avatar name={name} src={image} size={44} ring={look.border} />
        <span className="shop-look-name"><StyledName name={name} style={look} /></span>
        <span className="shop-look-meta">
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
            <li key={i.key} className={`shop-card r-${r}${trying?.key === i.key ? ' trying' : ''}`}>
              <button type="button" className="shop-prev-btn" aria-label={`Try on ${i.label}`} aria-pressed={trying?.key === i.key}
                onClick={() => setTrying(trying?.key === i.key ? null : i)}>{preview(i)}</button>
              <div className="shop-meta">
                <strong>{i.label}</strong>
                <span className="shop-tags">
                  <span className={`shop-tag r-${r}`}>{RARITY_LABEL[r]}</span>
                  {left !== null && !i.ownerOnly && <span className="shop-tag stock">{left === 0 ? 'Sold out' : `${left} of ${i.limit} left`}</span>}
                  {mine && !i.ownerOnly && <span className="shop-tag owned">Owned</span>}
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
    </>
  );
}
