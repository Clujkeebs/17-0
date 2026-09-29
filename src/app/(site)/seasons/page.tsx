import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo/meta';
import { ERAS, currentSeason, editionFor, seasonYears } from '@/lib/seo/seasons';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'NFL ratings by season, 1996 to today',
  description: 'A short guide to three decades of EA Sports Madden NFL ratings eras, from roster files on a disc to in-season live updates, and which season Gridiron Lab covers now.',
  path: '/seasons',
});

export default function SeasonsPage() {
  const years = seasonYears();
  const cur = currentSeason();
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Seasons', path: '/seasons' }]} />
      <span className="eyebrow">Ratings eras</span>
      <h1>Thirty years of ratings, one season of data</h1>
      <p className="muted" style={{ maxWidth: '64ch' }}>
        Gridiron Lab stores ratings for the current edition only. The older seasons below are context, not a database. The <Link href={`/seasons/${cur}`}>{cur} season</Link> is the one the games use.
      </p>
      {[...ERAS].reverse().map((era) => {
        const ys = years.filter((y) => y >= era.from && y <= era.to);
        if (!ys.length) return null;
        return (
          <section key={era.key} aria-labelledby={`era-${era.key}`} style={{ marginTop: 36 }}>
            <h2 id={`era-${era.key}`} style={{ fontSize: '1.3rem' }}>{era.name} <span className="num muted" style={{ fontWeight: 400, fontSize: '1rem' }}>{Math.min(...ys)} to {Math.max(...ys)}</span></h2>
            <p style={{ maxWidth: '66ch' }}>{era.summary}</p>
            <ul className="row" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ys.map((y) => (
                <li key={y}><Link className={`btn btn-sm${y === cur ? ' btn-primary' : ''}`} href={`/seasons/${y}`} title={editionFor(y)}><span className="num">{y}</span></Link></li>
              ))}
            </ul>
          </section>
        );
      })}
      <PlayCta />
    </div>
  );
}
