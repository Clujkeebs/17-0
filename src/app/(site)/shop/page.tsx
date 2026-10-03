import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { getUserById, nameStyleOf } from '@/lib/server/account';
import { EARN, ownedKeys, recentEvents, stockSold } from '@/lib/server/points';
import { ShopClient } from './ShopClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Shop',
  description: 'Spend the points you earn playing on name colors, fonts, avatar borders, banners, titles and flair. Limited editions for the first players only.',
  alternates: { canonical: '/shop' },
};

const REASON: Record<string, string> = {
  welcome: 'Welcome bonus', daily: 'Ranked game', perfect: 'Perfect result', casual: 'Casual game', streak: 'Streak milestone',
  board: 'Daily top 10', week: 'Weekly podium', backfill: 'Launch credit for past games', buy: 'Bought', owner: 'From the owner', pickem: "Pick 'em: right pick", 'pickem-week': "Pick 'em: perfect week", 'challenge-win': 'Won a challenge', 'challenge-defend': 'Defended your challenge',
};

export default async function ShopPage() {
  const session = await auth().catch(() => null);
  const user = session?.user?.id ? await getUserById(session.user.id) : null;
  const [owned, sold, events] = await Promise.all([
    user ? ownedKeys(user.id, user.email) : Promise.resolve(new Set<string>()),
    stockSold().catch(() => ({})),
    user ? recentEvents(user.id).catch(() => []) : Promise.resolve([]),
  ]);
  const style = user ? nameStyleOf(user) : null;
  const name = user ? user.name || user.username || 'You' : 'Your name';
  return (
    <div className="container section shop">
      <span className="eyebrow">Shop</span>
      <h1>Spend your points.</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>Points come from playing. Spend them on how your name looks on leaderboards and your profile. Points have no cash value and cannot be bought.</p>
      {user ? (
        <p className="row" style={{ gap: 10 }}><span className="pts-pill num" data-testid="balance">{user.points.toLocaleString('en-US')} pts</span><span className="muted">{user.pointsEarned.toLocaleString('en-US')} earned all time</span></p>
      ) : (
        <div className="card" style={{ margin: '16px 0' }}><p style={{ margin: 0 }}><Link href="/login?next=/shop">Sign in</Link> or <Link href="/register?next=/shop">create an account</Link> to earn points. New accounts start with {EARN.welcome}.</p></div>
      )}
      <ShopClient signedIn={!!user} points={user?.points ?? 0} owned={[...owned]} sold={sold} name={name} image={user?.image ?? null}
        equipped={style ? { font: style.font, color: style.color, border: style.border ?? null, banner: style.banner ?? null, title: style.title ?? null, flair: style.flair ?? null } : null} owner={!!style?.owner} />

      <section style={{ marginTop: 48 }}>
        <h2>How to earn</h2>
        <ul className="earn-list">
          <li><strong>{EARN.daily}</strong> for every ranked (Today) game, plus <strong>{EARN.perfect}</strong> for a perfect result</li>
          <li><strong>{EARN.board.slice(0, 3).join(' / ')}</strong> and down to {EARN.board.at(-1)} for finishing top 10 on any daily board</li>
          <li><strong>{EARN.week.join(' / ')}</strong> for the weekly podium of any game</li>
          <li>Streak milestones: {Object.entries(EARN.streak).map(([d, p]) => `${d} days ${p}`).join(', ')}</li>
          <li><strong>{EARN.casual}</strong> per casual game, up to {EARN.casualDailyCap} a day</li>
        </ul>
      </section>
      {events.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Recent points</h2>
          <ul className="pts-log">{events.map((e) => <li key={e.id}><span>{REASON[e.reason] ?? e.reason}</span><span className={`num ${e.amount < 0 ? 'neg' : 'pos'}`}>{e.amount > 0 ? '+' : ''}{e.amount}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
