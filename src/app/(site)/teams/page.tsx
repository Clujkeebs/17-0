import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo/meta';
import { divisionLabel, loadTeams, teamName } from '@/lib/seo/queries';
import type { TeamRow } from '@/lib/server/data';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'NFL teams: rosters and ratings by division',
  description: 'All 32 NFL teams grouped by division, with roster ratings by position group, head coach impact scores, and a 17-0 landing page for each.',
  path: '/teams',
});

export default async function TeamsPage() {
  const teams = await loadTeams();
  const divisions = new Map<string, TeamRow[]>();
  for (const t of teams) {
    const k = divisionLabel(t);
    divisions.set(k, [...(divisions.get(k) ?? []), t]);
  }
  const order = [...divisions.keys()].sort();

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Teams', path: '/teams' }]} />
      <span className="eyebrow">32 rosters</span>
      <h1>Teams, by division</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>Each team page lists the active roster by position group, the average overall, and the head coach&apos;s impact score.</p>
      {teams.length === 0 ? <EmptyState title="Teams are not loaded yet" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24, marginTop: 32 }}>
          {order.map((div) => (
            <section key={div} aria-labelledby={`d-${div}`} className="card">
              <h2 id={`d-${div}`} style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>{div}</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {divisions.get(div)!.map((t) => (
                  <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, background: t.primaryColor, border: '1px solid var(--steel)', flex: 'none' }} />
                    <Link href={`/teams/${t.slug}`}>{teamName(t)}</Link>
                    <span className="num muted" style={{ marginLeft: 'auto' }}>{t.abbreviation}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <PlayCta />
    </div>
  );
}
