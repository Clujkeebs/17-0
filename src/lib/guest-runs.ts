'use client';

/**
 * Runs finished while signed out. The browser keeps each game's private session token (never shown to anyone),
 * so after signing in the run can be moved onto the account: the server checks the token before it does.
 */
export interface GuestRun { id: string; sessionId: string; token: string }
const KEY = 'unbeaten:guest-runs';

export function guestRuns(): GuestRun[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string') : []; } catch { return []; }
}
export function rememberGuestRun(run: GuestRun) {
  try { localStorage.setItem(KEY, JSON.stringify([run, ...guestRuns().filter((x) => x.id !== run.id)].slice(0, 20))); } catch { /* storage off */ }
}
export function forgetGuestRuns(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(guestRuns().filter((x) => !ids.includes(x.id)))); } catch { /* storage off */ }
}
