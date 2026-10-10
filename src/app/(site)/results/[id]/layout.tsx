import { auth } from '@/auth';
import { GuestRunSaver } from '@/components/game/GuestRunSaver';
import { getResult } from '@/lib/server/leaderboard';

/** What counts as a run worth saving, by game. */
function greatRun(gameType: string, d: Record<string, unknown>): string | null {
  const wins = Number(d.wins), losses = Number(d.losses);
  if (gameType === '17-0' && wins >= 15) return `${wins}-${losses}`;
  if (gameType === '82-0' && wins >= 70) return `${wins}-${losses}`;
  if (gameType === '162-0' && wins >= 135) return `${wins}-${losses}`;
  if (gameType === 'build-a-player' && Number(d.rating) >= 90) return `A ${Number(d.rating).toFixed(1)} ${String(d.position ?? 'player')}`;
  return null;
}

export default async function ResultLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, session] = await Promise.all([getResult(id).catch(() => null), auth().catch(() => null)]);
  const headline = r ? greatRun(r.gameType, r.resultData as Record<string, unknown>) : null;
  return (
    <>
      {children}
      {r && <GuestRunSaver resultId={r.id} signedIn={!!session?.user?.id} owned={!!r.userId} great={!!headline} headline={headline ?? ''} />}
    </>
  );
}
