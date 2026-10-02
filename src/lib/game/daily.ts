/** Returns YYYY-MM-DD for the current day in America/New_York. Resets at midnight ET. */
export function dailyDateET(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

export const dailySeed = (gameType: string, date: string) => `daily:${gameType}:${date}`;

/** Streak: consecutive ET dates ending today or yesterday. Input is any set of YYYY-MM-DD strings. */
export function computeStreak(dates: string[], today: string = dailyDateET()): number {
  const set = new Set(dates);
  const prev = (d: string) => {
    const dt = new Date(`${d}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  };
  let cursor = set.has(today) ? today : prev(today);
  let streak = 0;
  while (set.has(cursor)) { streak++; cursor = prev(cursor); }
  return streak;
}

/** Longest run of consecutive days in the history, current or not. */
export function longestStreak(dates: string[]): number {
  const days = [...new Set(dates)].map((d) => Date.parse(`${d}T12:00:00Z`) / 86_400_000).sort((a, b) => a - b);
  let best = 0, run = 0;
  for (let i = 0; i < days.length; i++) { run = i > 0 && Math.round(days[i] - days[i - 1]) === 1 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}
