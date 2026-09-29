import { absUrl } from './meta';

export interface Crumb { name: string; path: string }

export function breadcrumbLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absUrl(c.path) })),
  };
}

export function faqLd(qa: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function sportsTeamLd(t: { name: string; path: string; logo?: string | null; coach?: string | null; members?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: t.name,
    sport: 'American football',
    url: absUrl(t.path),
    memberOf: { '@type': 'SportsOrganization', name: 'National Football League' },
    ...(t.logo ? { logo: t.logo } : {}),
    ...(t.coach ? { coach: { '@type': 'Person', name: t.coach } } : {}),
    ...(t.members?.length ? { athlete: t.members.map((name) => ({ '@type': 'Person', name })) } : {}),
  };
}

export function personLd(p: {
  name: string; path: string; jobTitle: string; image?: string | null; team?: { name: string; path: string } | null;
  heightInches?: number | null; weightLbs?: number | null; college?: string | null; description?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: absUrl(p.path),
    jobTitle: p.jobTitle,
    ...(p.description ? { description: p.description } : {}),
    ...(p.image ? { image: p.image } : {}),
    ...(p.team ? { affiliation: { '@type': 'SportsTeam', name: p.team.name, url: absUrl(p.team.path) } } : {}),
    ...(p.heightInches ? { height: { '@type': 'QuantitativeValue', value: p.heightInches, unitCode: 'INH' } } : {}),
    ...(p.weightLbs ? { weight: { '@type': 'QuantitativeValue', value: p.weightLbs, unitCode: 'LBR' } } : {}),
    ...(p.college ? { alumniOf: { '@type': 'CollegeOrUniversity', name: p.college } } : {}),
  };
}
