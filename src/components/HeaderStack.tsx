'use client';
import { useEffect } from 'react';

/** Publishes the header's real height (its row plus a live drop bar) as --header-stack, so sticky bars sit just under it. */
export function HeaderStack() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.site-header');
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--header-stack', `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--header-stack'); };
  }, []);
  return null;
}
