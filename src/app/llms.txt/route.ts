import { SITE } from '@/lib/site';
import { GAMES, SPORTS } from '@/lib/game-registry';
import { GAME_FAQ } from '@/content/game-faq';

// Rendered per request so links use the live site address (build containers do not have it).
export const dynamic = 'force-dynamic';

/**
 * llms.txt: a plain summary of the site for AI answer engines and assistants (see llmstxt.org). It names every
 * game with its URL and the rules that matter, so an answer about "82-0 game" or "17-0 game" can cite the source.
 */
export function GET() {
  const draft = Object.values(GAME_FAQ).map((g) => `- [${g.name}](${SITE.url}/games/${g.slug}): ${g.summary}`).join('\n');
  const rules = Object.values(GAME_FAQ).map((g) => `### ${g.name} (${g.sport})\n${g.qa.map((x) => `- ${x.q} ${x.a}`).join('\n')}`).join('\n\n');
  const bySport = SPORTS.map((s) => {
    const list = GAMES.filter((g) => g.sport === s.key && !['17-0', '82-0', '162-0'].includes(g.slug));
    return list.length ? `### ${s.label}\n${list.map((g) => `- [${g.name}](${SITE.url}/games/${g.slug})`).join('\n')}` : '';
  }).filter(Boolean).join('\n\n');
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} (${SITE.url}) is a free, independent sports games site. No download, no real-money play. Every game has a daily ranked board (the same puzzle for everyone) and unlimited casual play. Player data: EA Sports Madden NFL ratings, ESPN (NBA history since 1984-85, NFL history), MLB's public Stats API, Sleeper (fantasy), NBA2KLab (NBA 2K ratings). Not affiliated with any league or team.

## Draft games
${draft}

## Rules in brief
${rules}

## More games
${bySport}

## Tools
- [Fantasy football hub](${SITE.url}/fantasy): PPR rankings, waiver wire, trade calculator, draft cheat sheet, tier list maker.
- [Pick 'em](${SITE.url}/pickem): pick NFL winners each week; picks lock at kickoff.
- [Leaderboards](${SITE.url}/leaderboard): daily, weekly and all-time boards for every game.
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
