import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo/meta';
import { loadCoaches, loadTeamMap, teamName } from '@/lib/seo/queries';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'NFL head coaches ranked by impact score',
  description: 'Every NFL head coach ranked by the Gridiron Lab coach impact score: roster quality, recent win rate, playoff trips, rings, and tenure.',
  path: '/coaches',
});

export default async function CoachesPage() {
  const [coaches, teams] = await Promise.all([loadCoaches(), loadTeamMap()]);
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Coaches', path: '/coaches' }]} />
      <span className="eyebrow">Head coaches</span>
      <h1>Coach impact, ranked</h1>
      <p className="muted" style={{ maxWidth: '64ch' }}>
        The HC slot is 15 percent of team strength in 17-0. The score blends roster quality, recent winning, playoff trips, rings, and tenure.{' '}
        <Link href="/blog/coach-impact-score-explained">How the score works</Link>.
      </p>
      {coaches.length === 0 ? <EmptyState title="Coaches are not loaded yet" /> : (
        <div className="table-wrap" style={{ marginTop: 24 }}>
          <table>
            <caption className="sr-only">NFL head coaches by impact score</caption>
            <thead><tr><th scope="col" className="num">#</th><th scope="col">Coach</th><th scope="col">Team</th><th scope="col" className="num">Record</th><th scope="col" className="num">SB</th><th scope="col" className="num">Impact</th></tr></thead>
            <tbody>
              {coaches.map((c, i) => {
                const t = c.teamId != null ? teams.get(c.teamId) : undefined;
                return (
                  <tr key={c.id}>
                    <td className="num muted">{i + 1}</td>
                    <td><Link href={`/coaches/${c.slug}`}>{c.fullName}</Link></td>
                    <td>{t ? <Link className="muted" href={`/teams/${t.slug}`}>{teamName(t)}</Link> : <span className="muted">None</span>}</td>
                    <td className="num">{c.careerWins}-{c.careerLosses}</td>
                    <td className="num">{c.superBowlWins}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{c.coachImpactScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <PlayCta />
    </div>
  );
}
