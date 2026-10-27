import Link from 'next/link';
import { UPDATES } from '@/content/updates';
import { getLastSync } from '@/lib/server/data';
import { pageMeta } from '@/lib/seo/meta';
import { safe } from '@/lib/seo/safe';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const revalidate = 3600;

export const metadata = pageMeta({
  title: 'Updates: what changed on Unbeaten and when',
  description: 'Every new game, rule change and fix on Unbeaten, newest first, with the day it went out.',
  path: '/updates',
});

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default async function UpdatesPage() {
  const last = await safe(() => getLastSync(), null, 5000);
  const checked = last ? new Date(last).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : null;
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Updates', path: '/updates' }]} />
      <header className="page-head">
        <span className="eyebrow">Updates</span>
        <h1>What changed, and when</h1>
        <p>
          Every new game, rule change and fix, newest first. The date on each entry is the day it went out. How the numbers are made is on the <Link href="/blog">blog</Link>,
          and where they come from is in <Link href="/blog/where-our-data-comes-from">Where our data comes from</Link>.
        </p>
      </header>

      {checked && (
        <p className="muted" style={{ maxWidth: '64ch' }}>
          Player ratings were last refreshed from EA on {checked}. The check runs every morning. If it ever falls more than a week behind, a banner at the top of the site says so.
        </p>
      )}

      <ol style={{ listStyle: 'none', padding: 0, margin: '32px 0 0', maxWidth: 760 }}>
        {UPDATES.map((u) => (
          <li key={`${u.date}-${u.title}`} style={{ borderTop: '1px solid var(--steel)', padding: '22px 0' }}>
            <time className="muted num" dateTime={u.date} style={{ fontSize: '.85rem' }}>{day(u.date)}</time>
            <h2 style={{ fontSize: '1.25rem', margin: '6px 0 8px' }}>{u.title}</h2>
            <p style={{ margin: 0 }}>{u.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
