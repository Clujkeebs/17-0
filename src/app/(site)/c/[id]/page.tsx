import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { entrants, getChallenge, type ChallengeSetup } from '@/lib/server/challenges';
import { getResult, stylesFor } from '@/lib/server/leaderboard';
import { StyledName } from '@/components/StyledName';
import { ShareButton } from '@/components/game/ShareButton';
import { CHALLENGE_GAME_NAMES, faceOff, recordOf, rosterLines, setupChips } from '@/lib/challenge-view';
import { CHALLENGE_POINTS } from '@/lib/server/challenges';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getChallenge(id).catch(() => null);
  if (!c) return { title: 'Challenge not found', robots: { index: false } };
  const r = await getResult(c.creatorResultId).catch(() => null);
  const title = `${c.creatorName ?? 'A friend'} went ${recordOf(r?.resultData)} in ${CHALLENGE_GAME_NAMES[c.gameType]}. Beat it.`;
  return {
    title, description: 'Same spins, your picks. Draft from the exact same teams and see who goes further.',
    robots: { index: false, follow: true }, alternates: { canonical: `/c/${id}` },
    openGraph: { title, images: [`/api/og/game-result?id=${c.creatorResultId}`] },
    twitter: { card: 'summary_large_image', title, images: [`/api/og/game-result?id=${c.creatorResultId}`] },
  };
}

export default async function ChallengePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await getChallenge(id).catch(() => null);
  if (!c) notFound();
  const session = await auth().catch(() => null);
  const me = session?.user?.id ?? null;
  const [list, creator] = await Promise.all([entrants(c.id), getResult(c.creatorResultId)]);
  if (!creator) notFound();
  // "You": your signed-in entry, or the result you just finished as a guest (?r= from the result page).
  const mine = list.find((e) => (me && e.userId === me) || (sp.r && e.resultId === sp.r)) ?? null;
  const isCreator = !!mine && mine.resultId === c.creatorResultId;
  const played = !!mine;
  const board = list.filter((e) => e.resultId === c.creatorResultId || (e.userId && !e.hidden));
  const styles = await stylesFor(board.map((e) => e.userId ?? '')).catch(() => new Map());
  const game = CHALLENGE_GAME_NAMES[c.gameType];
  const by = c.creatorName ?? 'A friend';
  const setup = c.setup as ChallengeSetup;
  const mineResult = mine && !isCreator ? await getResult(mine.resultId) : null;
  const rows = mineResult ? faceOff(rosterLines(mineResult.resultData), rosterLines(creator.resultData)) : [];
  const verdict = mine && !isCreator ? (mine.score > creator.score ? 'win' : mine.score < creator.score ? 'loss' : 'tie') : null;
  const playHref = `/games/${c.gameType}?challenge=${c.id}`;

  return (
    <div className="container section ch">
      <span className="eyebrow">Challenge · {game}</span>
      <h1 className="ch-title">{isCreator ? <>Your {recordOf(creator.resultData)}. <span className="muted">Send it.</span></> : <>{by} went <span className="num">{recordOf(creator.resultData)}</span>. Beat it.</>}</h1>
      <p className="muted ch-lede">Same spins, same re-spins, your picks. Identical rosters always get identical records, so it comes down to the draft. Beat the record for {CHALLENGE_POINTS.win} points.</p>
      <ul className="ch-chips" aria-label="Setup">{setupChips(c.gameType, setup).map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="row ch-actions">
        {!played && <Link className="btn btn-primary btn-lg" href={playHref}>Play this challenge</Link>}
        <ShareButton text={isCreator ? `I went ${recordOf(creator.resultData)} in ${game}. Same spins, your picks. Beat it.` : `${by} went ${recordOf(creator.resultData)} in ${game}. Same spins. Beat it.`} url={`/c/${c.id}`} label={isCreator ? 'Send the challenge' : 'Share'} />
      </div>

      {verdict && (
        <section className={`card ch-verdict ${verdict}`} aria-live="polite">
          <p className="g-kicker" style={{ margin: 0 }}>{verdict === 'win' ? 'You win' : verdict === 'loss' ? `${by} wins` : 'Dead even'}</p>
          <p className="ch-score"><span className="num">{recordOf(mineResult?.resultData)}</span> <span className="muted">vs</span> <span className="num">{recordOf(creator.resultData)}</span></p>
          {verdict === 'win' && me && <p className="hint" style={{ margin: 0 }}>+{CHALLENGE_POINTS.win} points.</p>}
          {verdict === 'win' && !me && <p className="hint" style={{ margin: 0 }}><Link href={`/register?next=/c/${c.id}`}>Make an account</Link> next time to get on the board and earn points.</p>}
        </section>
      )}

      {rows.length > 0 && (
        <section className="ch-face" aria-labelledby="ch-face-h">
          <h2 id="ch-face-h">Spot by spot</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Rosters side by side">
            <table className="ch-table">
              <thead><tr><th scope="col">Spot</th><th scope="col">You</th><th scope="col">{by}</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.slot}>
                  <th scope="row" className="num">{r.slot}</th>
                  <td className={r.edge === 'a' ? 'ch-edge' : undefined}><span className="ch-name">{r.a.name}</span> <span className="ch-letter">{r.a.letter}</span></td>
                  <td className={r.edge === 'b' ? 'ch-edge' : undefined}>{r.b ? <><span className="ch-name">{r.b.name}</span> <span className="ch-letter">{r.b.letter}</span></> : ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
      {!played && <p className="hint">{by}&apos;s roster stays hidden until you finish, so nobody can copy it.</p>}

      <section className="ch-board" aria-labelledby="ch-board-h">
        <h2 id="ch-board-h">Who played</h2>
        <ol className="ch-list">
          {board.map((e, i) => {
            const you = mine?.resultId === e.resultId;
            const name = e.username ?? (e.resultId === c.creatorResultId ? by : 'Guest');
            return (
              <li key={e.resultId} className={`${you ? 'you' : ''}${e.resultId === c.creatorResultId ? ' maker' : ''}`}>
                <span className="ch-rank num">{i + 1}</span>
                <span className="ch-who">{e.userId ? <Link href={`/u/${e.username}`}><StyledName name={name} style={styles.get(e.userId)} /></Link> : name}{e.resultId === c.creatorResultId && <span className="ch-tag">Set the spins</span>}{you && <span className="ch-tag you">You</span>}</span>
                <span className="ch-rec num">{played ? <Link href={`/results/${e.resultId}`}>{e.wins}-{e.losses}</Link> : `${e.wins}-${e.losses}`}</span>
              </li>
            );
          })}
        </ol>
        {board.length < 2 && <p className="muted">Nobody has taken the challenge yet. Send the link.</p>}
      </section>
    </div>
  );
}
