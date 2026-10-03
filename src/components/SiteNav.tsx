'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavLink { label: string; href: string; strong?: boolean }
/** `phone`: shown only on phones (items folded out of the top row); `narrow`: only on the narrowest phones. */
export type Fold = 'phone' | 'narrow';
export interface NavSection { title: string; href?: string; links: NavLink[]; more?: string; only?: Fold }
/** `hideOn`: left out of the top row on phones (`phone`) or only on the narrowest (`narrow`); its links live in More there. */
export interface NavItem { label: string; href?: string; sections?: NavSection[]; hideOn?: Fold }
const itemClass = (f?: Fold) => (f === 'phone' ? ' sn-desk' : f === 'narrow' ? ' sn-wide' : '');
const secClass = (f?: Fold) => (f === 'phone' ? ' sn-phone' : f === 'narrow' ? ' sn-narrow' : '');

const Caret = () => <svg className="sn-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/**
 * Primary navigation. Menus open on hover with a mouse, and on click or tap everywhere (so phones get them too).
 * Escape, a click outside, or moving to another page closes them. On phones the row keeps Games, Fantasy and More; the rest folds into More.
 */
export function SiteNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const path = usePathname();
  const root = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setOpen(null); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(null); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open]);
  const fine = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hover = (label: string | null) => {
    if (!fine()) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(label), label ? 60 : 160);
  };
  const active = (href?: string) => !!href && (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`) || (href === '/games' && path.startsWith('/games')));

  return (
    <nav aria-label="Primary" className="sn" ref={root} onMouseLeave={() => hover(null)}>
      <ul className="sn-row">
        {items.map((it) => it.sections ? (
          <li key={it.label} className={`sn-item${itemClass(it.hideOn)}${open === it.label ? ' open' : ''}`} onMouseEnter={() => hover(it.label)}>
            <button type="button" className={`sn-top${active(it.href) ? ' on' : ''}`} aria-expanded={open === it.label} aria-controls={`sn-${it.label}`}
              onClick={() => setOpen((o) => (o === it.label ? null : it.label))}>
              {it.label}<Caret />
            </button>
            <div id={`sn-${it.label}`} className={`sn-panel${(it.sections.filter((x) => !x.only).length > 2) ? ' wide' : ''}`} hidden={open !== it.label}>
              <div className="sn-grid">
                {it.sections.map((s) => (
                  <div key={s.title} className={`sn-sec${secClass(s.only)}`}>
                    {s.href ? <Link className="sn-sec-h" href={s.href}>{s.title}</Link> : <span className="sn-sec-h">{s.title}</span>}
                    <ul>
                      {s.links.map((l) => <li key={l.href}><Link href={l.href} className={l.strong ? 'strong' : undefined} aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link></li>)}
                      {s.more && s.href && <li><Link href={s.href} className="sn-more">{s.more} →</Link></li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </li>
        ) : (
          <li key={it.label} className={`sn-item${itemClass(it.hideOn)}`}><Link href={it.href!} className={`sn-top${active(it.href) ? ' on' : ''}`} aria-current={active(it.href) ? 'page' : undefined}>{it.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}
