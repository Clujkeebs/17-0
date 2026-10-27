import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { BLOG_POSTS } from '@/content/blog';
import { ContactLink } from '@/components/ContactLink';

export const metadata: Metadata = {
  title: 'About',
  description: `${SITE.name} is a small, independent sports project: draft games for football, basketball and baseball, daily puzzles and fantasy tools. Here is what it is, how the numbers are made, and what it is not.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="container section">
      <article className="prose">
        <span className="eyebrow">About</span>
        <h1>A sports argument, settled by math.</h1>
        <p>
          {SITE.name} started with a question that comes up in every group chat: could a roster built from random pieces run the table? Six teams get
          spun. You take one player from each. The engine plays a 17-game season and tells you how close you got to 17-0.
        </p>
        <p>
          It is not a coin flip. Every player is graded from published ratings or real season stats, every grade comes from a formula you can read, and every
          season is simulated with a seeded random number generator, so the same seed and the same picks always produce the same result. The daily games give
          everyone the same board, which means the leaderboard is a fair fight.
        </p>

        <h2>What you can play</h2>
        <p>
          The same idea runs through every sport. Draft a roster from random teams and eras, and see whether it can go unbeaten.
        </p>
        <ul>
          <li><strong>Football.</strong> <Link href="/games/17-0">17-0</Link> drafts an NFL roster from six, twelve, sixteen or all fifty-three spots, with a current pool or an All-time pool of legends and coaches. <Link href="/games/build-a-player">Build a Player</Link> assembles one player trait by trait.</li>
          <li><strong>Basketball.</strong> <Link href="/games/82-0">82-0</Link> drafts an NBA starting five across five eras, and <Link href="/games/44-0">44-0</Link> does the same for the WNBA.</li>
          <li><strong>Baseball.</strong> <Link href="/games/162-0">162-0</Link> drafts a lineup, a starter and a closer from every season since 1970.</li>
          <li><strong>Everything else.</strong> <Link href="/games">Dozens of quick games</Link> for football, basketball, baseball, college sports and soccer, daily puzzles such as <Link href="/games/sports-connections">Sports Connections</Link> and <Link href="/games/sports-wordle">Sportle</Link>, a <Link href="/fantasy">fantasy football hub</Link> and weekly <Link href="/pickem">Pick &apos;em</Link>.</li>
          <li><strong>Reference pages</strong> for <Link href="/players">players</Link>, <Link href="/teams">teams</Link>, <Link href="/coaches">coaches</Link> and <Link href="/positions">positions</Link>, with the ratings and the formulas behind them.</li>
        </ul>

        <h2>How the numbers are made</h2>
        <p>
          We publish the formulas instead of asking you to trust them. The <Link href="/blog">blog</Link> has {BLOG_POSTS.length} posts that walk through them with worked examples:
          how <Link href="/blog/how-17-0-works">17-0 works</Link>, how <Link href="/blog/how-82-0-rates-a-player-season">basketball seasons</Link> and
          {' '}<Link href="/blog/how-162-0-grades-hitters-and-pitchers">baseball seasons</Link> are rated, why the <Link href="/blog/why-the-win-line-moves-every-night">win line moves a little each night</Link>, and
          the <Link href="/blog/how-rare-is-a-perfect-season">arithmetic of a perfect season</Link>. The post on <Link href="/blog/where-our-data-comes-from">where our data comes from</Link> names
          every source.
        </p>

        <h2>What it is</h2>
        <ul>
          <li>Free. No paywall, no premium tier, no loot boxes. Points are earned by playing and spent only on how your name looks.</li>
          <li>Supported by display ads, kept to the side of the page and never inside a game. That is the entire business model.</li>
          <li>Independent. We write the engine, the copy, the formulas and the bug fixes ourselves.</li>
        </ul>

        <h2>What it is not</h2>
        <ul>
          <li>Not affiliated with EA, ESPN, the NFL, the NBA, the WNBA, MLB or any team or league. Details in the <Link href="/legal/disclaimer">disclaimer</Link>.</li>
          <li>Not a sportsbook, a fantasy contest with prizes, or a prediction. No money changes hands and nothing here should inform a bet.</li>
          <li>Not a data business. <Link href="/legal/privacy">We never sell your data.</Link></li>
        </ul>

        <h2>Our standards</h2>
        <p>
          Numbers come from named public sources and are refreshed on a schedule. When a source goes stale, a banner at the top of the site says so. When a
          reader finds a mistake, we check it against the source, fix it, and note the date on any post it changed. We keep personal data to a minimum: IP
          addresses are hashed before they are stored, there is no third-party analytics, and the leaderboards show usernames only. The site is built to be
          usable with a keyboard and a screen reader, and the <Link href="/legal/accessibility">accessibility statement</Link> says where we fall short.
        </p>

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
