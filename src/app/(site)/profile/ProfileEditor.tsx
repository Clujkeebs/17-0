'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NAME_COLORS, NAME_FONTS, type NameStyle } from '@/lib/cosmetics';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';

interface Props {
  displayName: string; fallbackName: string; image: string | null; favoriteGames: string[]; nameFont: string; nameColor: string;
  longest: number; owner: boolean; allGames: { slug: string; name: string }[];
}

/** Resize a picked photo to a 160px square JPEG in the browser, so only a small image is ever uploaded. */
async function squareJpeg(file: File, size = 160): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.85);
}

export function ProfileEditor(p: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(p.displayName);
  const [image, setImage] = useState<string | null>(p.image);
  const [favs, setFavs] = useState<string[]>(p.favoriteGames);
  const [font, setFont] = useState(p.nameFont);
  const [color, setColor] = useState(p.nameColor);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const preview: NameStyle = p.owner ? { font: 'neon', color: 'rainbow', owner: true } : { font, color, owner: false };

  async function pickFile(f?: File) {
    if (!f) return;
    setErr('');
    try { setImage(await squareJpeg(f)); } catch { setErr('That file did not open as an image. Try a JPG or PNG.'); }
  }
  function toggleFav(slug: string) {
    setFavs((cur) => cur.includes(slug) ? cur.filter((x) => x !== slug) : cur.length >= 3 ? cur : [...cur, slug]);
  }
  async function save() {
    setBusy(true); setErr(''); setMsg('');
    const body: Record<string, unknown> = { displayName: name, image, favoriteGames: favs };
    if (!p.owner) { body.nameFont = font; body.nameColor = color; }
    try {
      const r = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'Could not save. Try again.');
      setMsg('Saved.'); setOpen(false); router.refresh(); window.dispatchEvent(new Event('profile-updated'));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  if (!open) return <button type="button" className="btn" onClick={() => setOpen(true)}>Edit profile</button>;

  return (
    <section className="card profile-edit" aria-labelledby="edit-h">
      <h2 id="edit-h">Edit profile</h2>

      <div className="pe-row">
        <Avatar name={name || p.fallbackName} src={image} size={72} />
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>{image ? 'Change picture' : 'Add a picture'}</button>
          {image && <button type="button" className="btn btn-sm" onClick={() => setImage(null)}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="pe-name">Display name</label>
        <input id="pe-name" type="text" value={name} maxLength={30} autoComplete="nickname" onChange={(e) => setName(e.target.value)} placeholder={p.fallbackName} />
        <p className="hint">Shown on your profile and in the header. Your username stays the same.</p>
      </div>

      <fieldset className="pe-set">
        <legend className="pe-legend">Favorite games <span className="muted">(up to three)</span></legend>
        <div className="pe-chips">
          {p.allGames.map((g) => (
            <label key={g.slug} className={`pe-chip${favs.includes(g.slug) ? ' on' : ''}`}>
              <input type="checkbox" checked={favs.includes(g.slug)} disabled={!favs.includes(g.slug) && favs.length >= 3} onChange={() => toggleFav(g.slug)} />
              {g.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="pe-set">
        <legend className="pe-legend">Name style</legend>
        <p className="name-preview"><StyledName name={name || p.fallbackName} style={preview} /></p>
        {p.owner ? (
          <p className="hint">The owner style is fixed to this account. Nobody else can unlock or equip it.</p>
        ) : (
          <>
            <p className="hint">Unlock fonts and colors with your longest daily streak. Yours is <strong className="num">{p.longest}</strong> {p.longest === 1 ? 'day' : 'days'}.</p>
            <StylePicker label="Font" options={NAME_FONTS} value={font} onChange={setFont} longest={p.longest} sample={(k) => <span className={`nm-f-${k}`}>Aa</span>} />
            <StylePicker label="Color" options={NAME_COLORS} value={color} onChange={setColor} longest={p.longest} sample={(k) => <span className={`nm-c-${k}`} style={{ fontWeight: 800 }}>Aa</span>} />
          </>
        )}
      </fieldset>

      {err && <p role="alert" className="field-error">{err}</p>}
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving' : 'Save'}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </div>
      <span className="sr-only" aria-live="polite">{msg}</span>
    </section>
  );
}

function StylePicker({ label, options, value, onChange, longest, sample }: {
  label: string; options: { key: string; label: string; unlock: number }[]; value: string; onChange: (k: string) => void; longest: number; sample: (k: string) => React.ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="pe-styles">
      {options.map((o) => {
        const locked = longest < o.unlock;
        return (
          <label key={o.key} className={`pe-style${value === o.key ? ' on' : ''}${locked ? ' locked' : ''}`}>
            <input type="radio" name={`style-${label}`} value={o.key} checked={value === o.key} disabled={locked} onChange={() => onChange(o.key)} />
            <span className="pe-sample" aria-hidden="true">{sample(o.key)}</span>
            <strong>{o.label}</strong>
            <span className="pe-req">{locked ? `${o.unlock}-day streak` : 'Unlocked'}</span>
          </label>
        );
      })}
    </div>
  );
}
