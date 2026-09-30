'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { PlayerFace } from '@/components/game/PlayerFace';

export interface SearchHit { id: string; name: string; position: string; team: string; teamColor: string; img: string | null }

/** Accessible player combobox backed by /api/mini-search. */
export function TypeaheadA({ label, onPick, disabled, usedIds = [], autoFocus, placeholder = 'Start typing a name' }: {
  label: string; onPick: (h: SearchHit) => void; disabled?: boolean; usedIds?: string[]; autoFocus?: boolean; placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/mini-search?q=${encodeURIComponent(q)}`, { signal: ctl.signal }).then((r) => r.json())
        .then((b) => { setHits(b.results ?? []); setActive(0); setOpen(true); }).catch(() => {});
    }, 120);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  const choose = (h: SearchHit | undefined) => {
    if (!h || usedIds.includes(h.id)) return;
    onPick(h); setQ(''); setHits([]); setOpen(false);
  };

  return (
    <div className="ga-ta">
      <label className="ga-lbl" htmlFor={id}>{label}</label>
      <input
        ref={ref} id={id} role="combobox" aria-expanded={open && hits.length > 0} aria-controls={`${id}-l`} aria-autocomplete="list"
        aria-activedescendant={open && hits[active] ? `${id}-${active}` : undefined}
        value={q} disabled={disabled} placeholder={placeholder} autoComplete="off" spellCheck={false}
        onChange={(e) => setQ(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)} onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); choose(hits[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul id={`${id}-l`} role="listbox">
          {hits.map((h, i) => {
            const used = usedIds.includes(h.id);
            return (
              <li key={h.id} id={`${id}-${i}`} role="option" aria-selected={i === active} aria-disabled={used} className={used ? 'used' : ''}
                onMouseDown={(e) => { e.preventDefault(); choose(h); }} onMouseEnter={() => setActive(i)}>
                <PlayerFace name={h.name} src={h.img} color={h.teamColor} size={32} />
                <span style={{ flex: 1 }}><strong>{h.name}</strong> <span className="muted">{h.position} · {h.team}{used ? ' · used' : ''}</span></span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
