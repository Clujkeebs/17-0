import { JsonLd } from '@/components/JsonLd';
import { faqLd } from '@/lib/seo/jsonld';
import { SITE } from '@/lib/site';
import type { GameFaq as Faq } from '@/content/game-faq';

/** How-it-works answers under a draft game, plus VideoGame and FAQPage data for search and answer engines. */
export function GameFaq({ faq }: { faq: Faq }) {
  return (
    <section className="g-faq" aria-labelledby="g-faq-h">
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'VideoGame', name: faq.name, url: `${SITE.url}/games/${faq.slug}`, description: faq.summary,
          genre: ['Sports', 'Draft', 'Trivia'], gamePlatform: 'Web browser', applicationCategory: 'GameApplication', operatingSystem: 'Any',
          isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url } },
        faqLd(faq.qa),
      ]} />
      <h2 id="g-faq-h">How {faq.name} works</h2>
      <p className="g-faq-lede">{faq.summary}</p>
      <dl>
        {faq.qa.map((x) => (
          <div key={x.q} className="g-faq-item">
            <dt>{x.q}</dt>
            <dd>{x.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
