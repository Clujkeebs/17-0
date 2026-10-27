import Link from 'next/link';
import { guideFor } from '@/content/game-guides';

/** The written guide under a quick game: what it is, where its numbers come from, how to play it better. */
export function GameGuide({ slug }: { slug: string }) {
  const g = guideFor(slug);
  if (!g) return null;
  return (
    <section className="container section game-guide" aria-labelledby="guide-h" style={{ maxWidth: 820 }}>
      <div className="prose">
        <h2 id="guide-h">About {g.name}</h2>
        {g.about.map((p, i) => <p key={i}>{p}</p>)}
        <h3>Tips</h3>
        <ul>{g.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        {g.read.length > 0 && (
          <>
            <h3>Keep reading</h3>
            <ul>{g.read.map((r) => <li key={r.href}><Link href={r.href}>{r.label}</Link></li>)}</ul>
          </>
        )}
        {g.more.length > 0 && (
          <>
            <h3>More games like this</h3>
            <ul>{g.more.map((m) => <li key={m.href}><Link href={m.href}>{m.label}</Link></li>)}</ul>
          </>
        )}
      </div>
    </section>
  );
}
