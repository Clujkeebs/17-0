/**
 * Short human summary for a stored result row, mirroring the text shown on leaderboards
 * and share cards. Pure and shared by the leaderboard and profile queries.
 * Guards missing wins/rating so legacy or partial rows render a dash instead of "undefined".
 */
export function scoreSummary(gameType: string, data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>;
  if (gameType === '17-0') return `${Number(d.wins ?? 0)}-${Number(d.losses ?? 0)}${d.hard ? ' · Hard' : ''}`;
  if (gameType === 'build-a-player') return `${String(d.position ?? '')} ${Number(d.rating ?? 0).toFixed(1)}`;
  return String(d.summary ?? '');
}
