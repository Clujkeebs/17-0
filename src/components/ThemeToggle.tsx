'use client';
import { useEffect, useState } from 'react';

/** Runs before paint (in the layout head) so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

/** Light or dark. Follows the system until you pick one. */
export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === 'dark');
    read();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem('theme'); } catch { /* */ }
      if (!stored) { document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light'; read(); }
    };
    mq.addEventListener('change', onSystem);
    return () => mq.removeEventListener('change', onSystem);
  }, []);
  const flip = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* */ }
    setDark(next === 'dark');
  };
  return (
    <button type="button" className={`theme-toggle${labelled ? ' labelled' : ' in-header'}`} onClick={flip} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dark
          ? <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></>
          : <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z" />}
      </svg>
      {labelled && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
