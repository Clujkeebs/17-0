'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KIND_LABELS, KIND_ORDER, itemsOf, type ItemKind, type ShopItem } from '@/lib/shop';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';

type Equipped = { font: string; color: string; border: string | null; banner: string | null; title: string | null; flair: string | null };

export function ShopClient({ signedIn, points, owned, sold, name, image, equipped, owner }: {
  signedIn: boolean; points: number; owned: string[]; sold: Record<string, number>; name: string; image: string | null; equipped: Equipped | null; owner: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ItemKind>('color');
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
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  }

  const isOn = (i: ShopItem) => (i.kind === 'font' ? base.font : i.kind === 'color' ? base.color : base[i.kind]) === i.key;
  const preview = (i: ShopItem) => {
    const s = { ...base, owner: false, [i.kind]: i.key } as Equipped & { owner: boolean };
    if (i.kind === 'border') return <Avatar name={name} src={image} size={56} ring={i.key} />;
    if (i.kind === 'banner') return <div className={`banner ${i.key} shop-banner`}><StyledName name={name} style={{ ...s, banner: i.key }} showTitle={false} /></div>;
    return <span className="shop-name"><StyledName name={name} style={s} showTitle={i.kind === 'title'} /></span>;
  };

  return (
    <>
      <nav className="lb-games" aria-label="Item type" style={{ marginTop: 20 }}>
        {KIND_ORDER.map((k) => <button key={k} type="button" className={`lb-chip${k === kind ? ' on' : ''}`} aria-pressed={k === kind} onClick={() => setKind(k)}>{KIND_LABELS[k]}</button>)}
      </nav>
      <div aria-live="polite">{msg && <p className={msg.ok ? 'hint' : 'field-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}</div>
      <ul className="shop-grid">
        {itemsOf(kind).filter((i) => !i.ownerOnly || owner).map((i) => {
          const mine = have.has(i.key);
          const left = i.limit ? Math.max(0, i.limit - (sold[i.key] ?? 0)) : null;
          const on = isOn(i);
          return (
            <li key={i.key} className={`shop-card${i.limit ? ' limited' : ''}${i.ownerOnly ? ' exclusive' : ''}`}>
              <div className="shop-prev">{preview(i)}</div>
              <div className="shop-meta">
                <strong>{i.label}</strong>
                {i.ownerOnly ? <span className="shop-tag">Owner exclusive</span> : i.limit ? <span className="shop-tag">{left === 0 ? 'Sold out' : `${left} of ${i.limit} left`}</span> : null}
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
