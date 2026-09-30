import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ContactLink, contactVerb } from '@/components/ContactLink';

export const metadata: Metadata = {
  title: 'About',
  description: `${SITE.name} is a small, independent football puzzle project. Here is what it is, how it works, and what it is not.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="container section">
      <article className="prose">
        <span className="eyebrow">About</span>
        <h1>A football argument, settled by math.</h1>
        <p>
          {SITE.name} started with a question that comes up in every group chat: could a roster built from random pieces run the table? Six teams get
          spun. You take one player from each. The engine plays a 17-game season and tells you how close you got to 17-0.
        </p>
        <p>
          It is not a coin flip. Every player is scored from EA Sports Madden NFL ratings using position-specific weights, and every season is simulated
          with a seeded random number generator, so the same seed and the same picks always produce the same result. The daily puzzle gives everyone the
          same six teams, which means the leaderboard is a fair fight.
        </p>

        <h2>What it is</h2>
        <ul>
          <li>Free. No paywall, no premium tier, no loot.</li>
          <li>Two games: <Link href="/games/17-0">17-0</Link>, where you draft a roster, and <Link href="/games/build-a-player">Build a Player</Link>, where you assemble one.</li>
          <li>Reference pages for <Link href="/players">players</Link>, <Link href="/teams">teams</Link>, <Link href="/coaches">coaches</Link>, and <Link href="/positions">positions</Link>, updated when ratings change.</li>
          <li>Supported by display ads. That is the entire business model.</li>
        </ul>

        <h2>What it is not</h2>
        <ul>
          <li>Not affiliated with EA, the NFL, the NFLPA, or any team. Details in the <Link href="/legal/disclaimer">disclaimer</Link>.</li>
          <li>Not a sportsbook, a fantasy contest, or a prediction. No money changes hands and nothing here should inform a bet.</li>
          <li>Not a data business. <Link href="/legal/privacy">We never sell your data.</Link></li>
        </ul>

        <h2>Who runs it</h2>
        <p>
          A small independent team operating out of Pacoima, California. We write the engine, the copy, and the bug fixes. If a formula looks wrong to you, it might
          be, and we would like to hear the argument.
        </p>

        <h2>Get in touch</h2>
        <p>
          Feedback, bug reports, and formula disputes: <ContactLink kind="general" />. Legal and privacy: <ContactLink kind="legal" />. Or skip the
          small talk and go straight to the <Link href="/contact">contact page</Link>.
        </p>
        <p>
          <Link className="btn btn-primary" href="/games/17-0">Play today&apos;s 17-0</Link>
        </p>
      </article>
    </div>
  );
}
