import { GAMES, gamesFor, type Sport } from '@/lib/game-registry';

/**
 * A short written guide for every quick game, shown under the game: what it is, where its numbers come from,
 * how to play it better and where to read more. The text is written once per kind of game and then filled in with
 * what is true of the sport (how a round works, the data source, the seasons covered), so each page describes its
 * own game. The rules here mirror each game's own how-to (src/lib/minigames/**); change one, change the other.
 */
export interface GameGuide {
  name: string;
  about: string[];
  tips: string[];
  read: { label: string; href: string }[];
  more: { label: string; href: string }[];
}

type Family =
  | 'higher-lower' | 'blind-resume' | 'who-led' | 'whose-team' | 'rank-em' | 'guess' | 'odd-one-out' | 'top100' | 'build' | 'puzzle'
  | 'grid' | 'mystery' | 'top-ten' | 'rating-match' | 'name-team' | 'jersey' | 'compare-pair' | 'college-school' | 'nationality' | 'league-pick' | 'start-em';

/** Which kind of game a slug is. Order matters: the first match wins. */
const FAMILY: [RegExp, Family][] = [
  [/^(cfb|cbb|wcbb)-build-a-player$|^build-a-soccer-player$/, 'build'],
  [/^top-100-/, 'top100'],
  [/^(sports-connections|sports-wordle|sports-strands|sports-crossword)$/, 'puzzle'],
  [/^soccer-(top-scorer|assist-king)$/, 'who-led'],
  [/^soccer-rank-goals$/, 'rank-em'],
  [/^soccer-odd-club$|^odd-one-out$|^division-line$/, 'odd-one-out'],
  [/^soccer-which-league$/, 'league-pick'],
  [/^soccer-where-from$/, 'nationality'],
  [/^wheres-he-from$/, 'college-school'],
  [/^soccer-whose-club$|whose-team$/, 'whose-team'],
  [/^fantasy-start-em$/, 'start-em'],
  [/rank-em$/, 'rank-em'],
  [/higher-lower$/, 'higher-lower'],
  [/blind-resume$/, 'blind-resume'],
  [/who-led$/, 'who-led'],
  [/guess(-the-ovr)?$/, 'guess'],
  [/^(speed-trap|size-up|vet-check)$/, 'compare-pair'],
  [/^grid$/, 'grid'],
  [/^mystery-player$/, 'mystery'],
  [/^top-ten$/, 'top-ten'],
  [/^rating-match$/, 'rating-match'],
  [/^name-that-team$/, 'name-team'],
  [/^numbers-game$/, 'jersey'],
];

export const familyOf = (slug: string): Family | null => FAMILY.find(([re]) => re.test(slug))?.[1] ?? null;

/** What a game is built on, which decides how its rounds read: football ratings, 2K ratings, season stats, and so on. */
type Group = 'nfl' | '2k' | 'hoops' | 'cfb' | 'mlb' | 'soccer';
type Kind = 'nfl' | 'nba' | 'wnba' | 'cbb' | 'wcbb' | 'cfb' | 'mlb' | 'soccer' | '2k' | 'fantasy';

interface Facts { who: string; whoOne: string; data: string; scope: string; g: Group; k: Kind; he: 'he' | 'she'; his: 'his' | 'her' }

/** What each Top 100 list is built from. */
const TOP100: Record<string, Pick<Facts, 'who' | 'whoOne' | 'data' | 'scope'>> = {
  'top-100-nfl-now': { who: 'NFL players', whoOne: 'an NFL player', data: 'the highest EA Sports Madden NFL overall ratings', scope: 'players on current rosters' },
  'top-100-nfl-all': { who: 'retired NFL players', whoOne: 'a retired NFL player', data: 'each retired player\'s best season, graded from ESPN stats the way the All-time mode grades legends', scope: 'players since 1980' },
  'top-100-nba-now': { who: 'NBA players', whoOne: 'an NBA player', data: 'current NBA 2K overall ratings, via NBA2KLab', scope: 'players on today\'s rosters' },
  'top-100-nba-all': { who: 'NBA players', whoOne: 'an NBA player', data: 'the 100 best single seasons by our rating, one per player, from ESPN stats', scope: 'every season since 1984-85' },
  'top-100-mlb-now': { who: 'MLB players', whoOne: 'an MLB player', data: 'the best stat grades of the current season, from MLB\'s public Stats API', scope: '' },
  'top-100-mlb-all': { who: 'MLB players', whoOne: 'an MLB player', data: 'the 100 best single seasons by our grade, one per player, from MLB\'s public Stats API', scope: 'seasons since 1970' },
};

function kindOf(slug: string, sport: Sport): Kind {
  if (slug.startsWith('fantasy-')) return 'fantasy';
  if (slug.startsWith('nba-2k')) return '2k';
  if (slug.startsWith('wcbb')) return 'wcbb';
  if (slug.startsWith('cbb')) return 'cbb';
  if (slug.startsWith('cfb')) return 'cfb';
  switch (sport) {
    case 'nba': return 'nba';
    case 'wnba': return 'wnba';
    case 'mlb': return 'mlb';
    case 'soccer': return 'soccer';
    default: return 'nfl';
  }
}

const GROUP_OF: Record<Kind, Group> = { nfl: 'nfl', nba: 'hoops', wnba: 'hoops', cbb: 'hoops', wcbb: 'hoops', cfb: 'cfb', mlb: 'mlb', soccer: 'soccer', '2k': '2k', fantasy: 'nfl' };

function factsFor(slug: string, sport: Sport): Facts {
  const k = kindOf(slug, sport);
  const women = k === 'wnba' || k === 'wcbb';
  const pronouns = { he: women ? 'she' : 'he', his: women ? 'her' : 'his' } as const;
  const base = (who: string, whoOne: string, data: string, scope: string): Facts => ({ who, whoOne, data, scope, g: GROUP_OF[k], k, ...pronouns });
  if (TOP100[slug]) return { ...TOP100[slug], g: GROUP_OF[k], k, ...pronouns };
  switch (k) {
    case 'fantasy': return base('NFL players', 'an NFL player', 'Sleeper\'s PPR fantasy points per game, with recent games counting most, the same numbers as the fantasy rankings', 'players on current rosters');
    case '2k': return base('current NBA players', 'a current NBA player', 'NBA 2K overall ratings, via NBA2KLab', 'players on today\'s rosters');
    case 'nba': return base('NBA players', 'an NBA player', 'ESPN\'s per-game stats', 'every season since 1984-85');
    case 'wnba': return base('WNBA players', 'a WNBA player', 'ESPN\'s per-game stats', 'WNBA seasons since 1997');
    case 'cfb': return base('college football players', 'a college football player', 'ESPN\'s season stats for passing, rushing, receiving and defense', 'real college seasons');
    case 'cbb': return base('men\'s college basketball players', 'a men\'s college basketball player', 'ESPN\'s per-game stats', 'real college seasons');
    case 'wcbb': return base('women\'s college basketball players', 'a women\'s college basketball player', 'ESPN\'s per-game stats', 'real college seasons');
    case 'mlb': return base('MLB players', 'an MLB player', 'MLB\'s public Stats API', 'seasons since 1970');
    case 'soccer': return base('soccer players', 'a soccer player', 'ESPN\'s soccer data for the Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and MLS', 'recent league seasons and current rosters');
    default: return base('NFL players', 'an NFL player', 'EA Sports Madden NFL ratings, with rosters from ESPN', 'players on current rosters');
  }
}

const READ = {
  data: { label: 'Where our data comes from', href: '/blog/where-our-data-comes-from' },
  ranked: { label: 'How Today and Casual work', href: '/blog/today-and-casual-how-ranked-play-works' },
  madden: { label: 'Madden NFL ratings, explained', href: '/blog/ea-sports-madden-nfl-ratings-explained' },
  allTime: { label: 'All-time mode: legends and coaches', href: '/blog/all-time-mode-legends-and-coaches' },
  nba: { label: 'How 82-0 rates a player season', href: '/blog/how-82-0-rates-a-player-season' },
  wnba: { label: '44-0 guide: drafting a WNBA lineup', href: '/blog/44-0-guide-drafting-a-wnba-lineup' },
  mlb: { label: 'How 162-0 grades hitters and pitchers', href: '/blog/how-162-0-grades-hitters-and-pitchers' },
  vor: { label: 'Value over replacement, explained', href: '/blog/value-over-replacement-fantasy-football-explained' },
  ppr: { label: 'PPR, half PPR and standard scoring', href: '/blog/ppr-half-ppr-and-standard-scoring-explained' },
  bap: { label: 'Build a Player: the case for stealing one trait', href: '/blog/build-a-player-the-case-for-stealing-one-attribute' },
  connections: { label: 'Sports Connections tips and scoring', href: '/blog/sports-connections-tips-and-scoring' },
  sportle: { label: 'Sportle strategy and the word list', href: '/blog/sportle-strategy-and-the-word-list' },
  strands: { label: 'Strands and the crossword: how they work', href: '/blog/sports-strands-and-crossword-how-they-work' },
};

function readFor(slug: string, f: Facts, family: Family): { label: string; href: string }[] {
  if (family === 'puzzle') return [slug === 'sports-connections' ? READ.connections : slug === 'sports-wordle' ? READ.sportle : READ.strands, READ.ranked];
  const sportRead =
    f.k === 'fantasy' ? [READ.vor, READ.ppr]
    : slug === 'top-100-nfl-all' ? [READ.allTime]
    : slug === 'top-100-nba-all' ? [READ.nba]
    : slug.startsWith('top-100-mlb') ? [READ.mlb]
    : slug === 'top-100-nba-now' ? []
    : f.g === 'nfl' ? [READ.madden]
    : f.k === 'nba' ? [READ.nba]
    : f.k === 'wnba' ? [READ.wnba]
    : f.g === 'mlb' ? [READ.mlb]
    : [];
  return [...(family === 'build' ? [READ.bap] : []), ...sportRead, READ.data, READ.ranked].slice(0, 3);
}

/** Other games on the same sport, a few of them, chosen by the slug so the choice is stable. */
function moreFor(slug: string, sport: Sport) {
  // College covers three leagues (cfb, cbb, wcbb); suggest games from the same one.
  const league = (x: string) => (sport === 'college' ? x.split('-')[0] : '');
  const pool = gamesFor(sport).filter((g) => g.slug !== slug && league(g.slug) === league(slug));
  if (!pool.length) return [];
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const start = h % pool.length;
  return Array.from({ length: Math.min(4, pool.length) }, (_, i) => pool[(start + i) % pool.length]).map((g) => ({ label: g.name, href: `/games/${g.slug}` }));
}

type Text = { about: string[]; tips: string[] };
type Builder = (f: Facts, name: string, slug: string) => Text;

const STAR_TIP = 'Do not assume the star led in everything. A second option often leads in a stat the star does not chase.';
const HURT_TIP = 'Remember who was hurt. A player who missed half the year rarely leads a counting stat.';

const TEXT: Record<Family, Builder> = {
  'higher-lower': (f, n) => {
    const round: Record<Group, string> = {
      nfl: 'Each round shows two current players and one Madden rating, and you tap the player who rates higher.',
      '2k': 'Each round shows two current players, and you tap the one with the higher NBA 2K overall.',
      hoops: 'Each round shows two players, each in one real season, and one per-game stat, and you tap the player who averaged more.',
      cfb: 'Each round shows two players, each in one real season, and one stat from passing, rushing, receiving or defense, and you tap the player with more.',
      mlb: 'Each round shows two well-known players, each in one season, and one stat: home runs, RBI, steals, average, strikeouts, wins or saves. You tap the player with the higher number.',
      soccer: 'Each round shows two players from the same league and season, and you tap the one with more league goals, or more assists when the round says so.',
    };
    const tip: Record<Group, string> = {
      nfl: 'Positions have their own scales. A kicker or a lineman can rate above a famous skill player, so do not choose by fame.',
      '2k': 'A star big man and a star guard can rate alike with very different stat lines, so judge how the league regards a player, not one number.',
      hoops: 'Per-game numbers follow minutes and role. A starter on a thin team can out-average a better player who shared the ball.',
      cfb: 'Passing numbers run far above rushing and receiving numbers, so the category tells you the scale before the names do.',
      mlb: 'Role sets the stat. A closer owns the saves, a power hitter the home runs and a leadoff man the steals.',
      soccer: 'Role sets the stat. Forwards score and midfielders set up goals, and both players come from the same league and season, so compare them on that footing.',
    };
    return {
      about: [
        `${n} is a ten-round comparison game. ${round[f.g]} Ties count either way, and the reveal shows every number. It tests how well you know the scale, not just the names, because a famous player can carry a lower number than a quiet one.`,
        `The numbers come from ${f.data}, covering ${f.scope}.`,
      ],
      tips: [
        'Start with the size of the gap. Wide gaps are easy, so keep your thinking for the close pairs.',
        tip[f.g],
        'Read the reveal after every game. Seeing the real values for the pairs you missed is the fastest way to calibrate.',
      ],
    };
  },
  'blind-resume': (f, n) => {
    const round: Partial<Record<Group, string>> = {
      nfl: 'Each round shows an anonymous Madden profile: position, archetype, age, size and the six ratings that matter most for the position. You pick the player from four options at the same position with a similar overall. There are five rounds worth one point each, and no clock. Once per game you can lock in a Confident pick: right is worth two points, wrong costs one.',
      hoops: 'Each round shows one season\'s per-game line: points, rebounds and assists. You pick the player who put it up from four who played that season. There are six rounds.',
      cfb: 'Each round shows one season\'s stat line in one category, such as passing, rushing, receiving or defense. You pick the player who put it up from four who were among their teams\' leaders that year. There are six rounds.',
      mlb: 'Each round shows one season: average, homers, RBI, steals and OPS for a hitter, or wins or saves, ERA and strikeouts for a pitcher. You pick the player who put it up from four who played that season in the same role. There are six rounds.',
    };
    const tips: Partial<Record<Group, string[]>> = {
      nfl: [
        'Read the archetype and size first. They rule out half the options before the ratings do.',
        'Spend Confident on the round you are surest of. It pays two for a right pick and costs one for a wrong one, and you get it once per game.',
        'The four options share a position and a similar overall, so the answer is in the six listed ratings. Look for the one that stands out.',
      ],
      hoops: [
        'Rule out by role first. Many rebounds with few assists points to a big man, and many assists with few rebounds points to a guard.',
        'All four played that season, so use what you know about who was good that year.',
        'Scoring levels have moved over the decades. A 25 point line means different things in different eras.',
      ],
      cfb: [
        'Start from the category. It sets the scale, because a big season of passing yards, rushing yards or tackles means very different numbers.',
        'All four options were among their teams\' leaders, so none of them is a throwaway. Weigh the school and the year.',
        'When two options both fit, pick the one whose season you can place most confidently.',
      ],
      mlb: [
        'All four share a role, so use the shape of the line. Steals point to speed, saves to a closer, and wins with strikeouts to a starter.',
        'Use the year. Offense and pitching have both swung over the decades, and the same line reads differently in different seasons.',
        'When two options both fit, pick the one whose season you can place most confidently.',
      ],
    };
    return {
      about: [
        `${n} hides the name and shows the evidence. ${round[f.g]} It tests whether you can read numbers the way a scout reads film, working back from the evidence to the player.`,
        `The ${f.g === 'nfl' ? 'profiles' : 'lines'} come from ${f.data}, covering ${f.scope}. ${f.g === 'nfl' ? 'Every option is a real player at the same position' : f.g === 'mlb' ? 'Every option is a real player from the same season and role' : 'Every option is a real player from the same season'}, so there is no throwaway answer.`,
      ],
      tips: tips[f.g] ?? [],
    };
  },
  'who-led': (f, n, slug) => {
    if (f.g === 'soccer') {
      const goals = slug === 'soccer-top-scorer';
      return {
        about: [
          `${n} names a league season and four players from its leader lists, and you pick the one with the most league ${goals ? 'goals' : 'assists'} that season. There are six rounds. It tests how well you know who carried a league in a given year, which is different from who was the biggest name.`,
          `The answers come from ${f.data}, covering ${f.scope}. All four options sit on that season's leader lists, so each had a real year, and the question is who was best at the stat.`,
        ],
        tips: [
          goals
            ? 'Think about role. The league leader in goals is usually a main striker, so start with the strikers who were healthy all year.'
            : 'Think about role. Assists come mostly from wingers and attacking midfielders, so a striker with many goals can still sit low on this list.',
          STAR_TIP,
          HURT_TIP,
        ],
      };
    }
    const round: Partial<Record<Group, string>> = {
      hoops: 'names a team and a season and a per-game stat, and you pick the player who led that team in it. All four options were on the roster.',
      cfb: 'names a team and a season and a stat: rushing, receiving or tackles. You pick the player who led that team in it from four of the team\'s leaders.',
      mlb: 'names a team and a season and a stat: home runs, RBI or steals. You pick the player who led that team among its everyday players, from four who were on the roster.',
    };
    const role: Partial<Record<Group, string>> = {
      hoops: 'Think about role. Assists usually belong to a guard, rebounds to a big man, and points to whoever had the ball most.',
      cfb: 'Match the stat to the position. Rushing leaders are backs, receiving leaders are receivers, and tackles lead from linebackers and safeties.',
      mlb: 'Match the stat to the player type. Power hitters lead in home runs and RBI, and fast leadoff hitters in steals.',
    };
    return {
      about: [
        `${n} ${round[f.g]} There are six rounds. It tests how well you know who carried a team in a given year, which is different from who was the biggest name.`,
        `The answers come from ${f.data}, covering ${f.scope}. Every option really played for that team that year, so the question is who was best at the stat, not who was there.`,
      ],
      tips: [role[f.g] ?? '', STAR_TIP, HURT_TIP].filter(Boolean),
    };
  },
  'whose-team': (f, n, slug) => {
    if (slug === 'soccer-whose-club') {
      return {
        about: [
          `${n} names a current player from one of Europe's big five leagues or MLS who made a recent goals or assists list, and you pick the club ${f.he} plays for now. There are six rounds, and all four clubs in each round come from ${f.his} league, so you cannot rule one out by geography.`,
          `The players come from ${f.data}. Rosters update daily, so a transfer shows up quickly.`,
        ],
        tips: [
          'Check for recent moves. A star who changed clubs this season is the question this game likes best.',
          'Eliminate clubs by what you know of their squads before you pick among the rest.',
          'Use the reveal. It names the player\'s club and the squad around him, which is what the next round will ask about.',
        ],
      };
    }
    const school = f.k === 'cfb';
    const college = f.k === 'cfb' || f.k === 'cbb' || f.k === 'wcbb';
    const noun = school ? 'school' : 'team';
    return {
      about: [
        `${n} names ${f.whoOne} and a season, and you pick the ${noun} ${f.he} played for that year. The four options are all ${noun}s from that season, and there are six rounds. It tests the part of a career that box scores hide: the moves. ${college ? 'Transfers' : 'Trades and free agency'} mean the ${noun} you associate with a player is often not the one ${f.he} was on that year.`,
        `The answers come from ${f.data}, covering ${f.scope}. The wrong options are other ${noun}s from the same season, so you cannot rule one out by era.`,
      ],
      tips: [
        `Anchor on the year, not the name. Ask where the player was in that season, not where ${f.he} is remembered.`,
        `Eliminate ${noun}s you know ${f.he} never played for before choosing among the rest.`,
        college
          ? 'Remember transfers. Many college players finish at a different school from where they started, and that is exactly what this game asks.'
          : 'A player who looks out of place on a team in your memory was probably there for a short stretch. That is exactly the kind of question this game asks.',
      ],
    };
  },
  'rank-em': (f, n, slug) => {
    const what: Record<string, string> = {
      'rank-em': 'five current players and one Madden rating to put in order from highest to lowest',
      'fantasy-rank-em': 'five players at one position to put in order of PPR fantasy points per game, most to fewest',
      'nba-2k-rank-em': 'five current NBA players to put in order of NBA 2K overall, highest to lowest',
      'mlb-rank-em': 'five well-known players, each in one season, and one stat: home runs, RBI, steals, strikeouts or saves. You put them in order from most to fewest',
      'soccer-rank-goals': 'five scorers from one league season to put in order of league goals, most to fewest',
    };
    return {
      about: [
        `${n} gives you ${what[slug] ?? 'five items to put in order'}. You move them with the up and down buttons, or drag on desktop. It scores pairs, not just positions: each of the 10 pairs you order correctly is worth 10 points and each exact slot adds 4, so a mostly right order still scores well.`,
        `The numbers come from ${f.data}, covering ${f.scope}. The reveal shows each value so you can see where your picture of the five was off.`,
      ],
      tips: [
        'Place the best and the worst first. The extremes are the easiest to judge, and the middle fills in around them.',
        'Remember the scoring: getting every pair right matters more than nailing one slot.',
        'If two items look equal, put the one you know more about higher. Ties in your head are usually not ties in the data.',
      ],
    };
  },
  guess: (f, n) => ({
    about: [
      `${n} asks you to estimate a rating. Each round shows a player and two ${f.g === '2k' ? 'others' : 'teammates'} at his position with their overalls, for calibration, and you set a guess from 40 to 99 with the slider or the plus and minus buttons. There are six rounds. A round is worth 100 for an exact guess and 10 less for every point you miss by, so a miss of ten or more is worth nothing and 600 is perfect.`,
      `The numbers come from ${f.data}. Players at the same position tend to cluster, which is why the calibration players are shown.`,
    ],
    tips: [
      'Use the two shown players as anchors. They play the same position, so their numbers are on the same scale as the one you are guessing.',
      'When you are unsure, guess near the middle of your range. A miss of ten is a zero, so a hedge costs less than a bold wrong guess.',
      'Position matters: ratings at some positions run higher than others, so compare within a position, not across.',
    ],
  }),
  'odd-one-out': (f, n, slug) => {
    const round: Record<string, string> = {
      'odd-one-out': 'shows four current players and their teams, and three of them played at the same college. You tap the one who did not. There are six rounds worth 100 each, and the schools show at the end. It tests connections that fans rarely think about.',
      'division-line': 'shows four players and their teams, and three of the teams share a division. You tap the odd one out. There are six rounds worth 100 each, and the divisions show at the end. It tests how well you know the league\'s map.',
      'soccer-odd-club': 'shows four current players from the same league with their clubs hidden, and three of them play for the same club. You tap the one who plays somewhere else. There are six rounds, and the reveal shows every club. It tests how well you know who plays where.',
    };
    return {
      about: [
        `${n} ${round[slug]}`,
        `The groups are built from ${f.data}. The shared feature is always a fact you can look up, never an opinion.`,
      ],
      tips: [
        slug === 'division-line'
          ? 'Learn the divisions once. The league has eight divisions of four teams, so every team has three neighbors you can name.'
          : 'Find the pair you are sure of first. Once two share something, the third is easier to place.',
        'Do not look for the famous one. The odd one out is as likely to be a star as a role player.',
        'Check the reveal. The explanations show the shared feature, which is the lesson for the next round.',
      ],
    };
  },
  top100: (f, n, slug) => ({
    about: [
      `${n} asks you to name as many of a ranked list of 100 as you can. Each empty slot shows a rank and a hint, such as a position, a team or a season. You type a name and press Enter, and a hit fills the slot at its rank. There is no time limit, and you can stop whenever you are stuck. Ranked play counts players found, then time.`,
      `The list comes from ${f.data}${f.scope ? `, covering ${f.scope}` : ''}. A full name always counts, and a last name alone counts when only one player on the list has it.`,
    ],
    tips: [
      'Work by position or by team. Taking the hints one at a time is faster than naming at random.',
      'Start with the top of the list. The highest ranks are the names you know best, and they set your pace.',
      slug.endsWith('-all')
        ? 'Think about eras. A decade you know well gives you a dozen names at once.'
        : 'Think team by team. Every roster you can picture gives you a name or two.',
    ],
  }),
  build: (f, n, slug) => {
    const skillTips = [
      'Take the skill that is furthest above a star level on that board, even from an unfamiliar player.',
      'Lock in the hard-to-find skills early and leave the ones that show up on every board for the end.',
      'Read the reveal. It shows the best build the board allowed, which is the number to chase.',
    ];
    if (slug === 'build-a-soccer-player') {
      return {
        about: [
          `In ${n} you build one player from three real seasons. Each club shows its players' seasons on a league goal or assist leader list. You take one season from each club and give it a trait: Finishing uses his goals per match, Playmaking his assists per match, and Fitness his matches played.`,
          `Your player's season is those rates over those matches, and the score is goals plus assists. The seasons come from ${f.data}. The reveal shows the best build the board allowed.`,
        ],
        tips: [
          'Fitness is the number of matches, and it multiplies both rates. A season with many matches is worth more than it looks.',
          'Finishing and Playmaking are rates per match. Give each the season where that rate is highest, not the season with the most total goals.',
          skillTips[2],
        ],
      };
    }
    if (f.k === 'cfb') {
      return {
        about: [
          `In ${n} you build one player from pieces of five real college seasons. Each round shows one college team in one real season, with its leader in six skills: passing, rushing, receiving, pass rush, ball hawk and tackling. You take one skill from each team and use five different skills, so your player gets those seasons.`,
          `Each skill is scored against a star season, one better than 95 in 100 team leaders, and 100 means a star at all five. The seasons come from ${f.data}. The reveal shows the best build the board allowed.`,
        ],
        tips: skillTips,
      };
    }
    return {
      about: [
        `In ${n} you build one player from five real seasons. Each round shows one ${f.k === 'wcbb' ? 'women\'s' : 'men\'s'} college basketball program in one real season, with six of its rotation players. You take one player from each program and give that player's season a skill: Scoring, Rebounding, Playmaking, Steals or Blocks. Each skill is used once.`,
        `Your player gets those numbers, each scored against a star's level, and 100 means a star at everything. The seasons come from ${f.data}. The reveal shows the best build the board allowed.`,
      ],
      tips: skillTips,
    };
  },
  puzzle: (_f, n, slug) => {
    const rules: Record<string, string> = {
      'sports-connections': 'Sixteen tiles hide four groups of four that share something. You select four and submit, a correct group locks in its color, and four mistakes end the game. A guess with three of four right tells you that you were one away. Ranked play counts groups found, then fewest mistakes, then fastest time.',
      'sports-wordle': 'You have six tries at a five-letter word: a current star\'s last name, a team name or a sports term, with a hint at the start that says which. Green is the right letter in the right spot and gold is in the word elsewhere. Ranked play counts fewest guesses, then fastest time.',
      'sports-strands': 'A board of letters, six across and eight down, hides a sports theme. Every letter belongs to one hidden word, and one of them, the spangram, names the theme and runs from one edge of the board to the other. Ranked play counts words found, then fewest hints, then fastest time.',
      'sports-crossword': 'Eight sports words cross one another on a small grid, with a clue for each. The Check button counts wrong letters without showing which, and each check that finds a mistake adds ten seconds. Ranked play counts solving it, then fastest time.',
    };
    const intro: Record<string, string> = {
      'sports-connections': 'a daily grouping puzzle',
      'sports-wordle': 'a daily word guessing puzzle',
      'sports-strands': 'a daily themed word search',
      'sports-crossword': 'a daily mini crossword',
    };
    return {
      about: [
        `${n} is ${intro[slug] ?? 'a daily puzzle about sports'}. Everyone gets the same puzzle each day in Today, which is ranked, and a fresh one each time in Casual, which is unlimited. The puzzles are built from hand-picked sports words, terms and facts, and the answers are always checkable.`,
        rules[slug] ?? '',
      ].filter(Boolean),
      tips: [
        'Play Casual a few times before your ranked try. The puzzle types reward habits more than knowledge.',
        'Read the scoring in the rules above. Each puzzle ranks something different, such as fewest guesses, fewest mistakes or fastest time.',
        'Share your result from the end screen. It shows how you did without giving away the answer.',
      ],
    };
  },
  grid: (f, n) => ({
    about: [
      `${n} is a three by three board. Three rows name teams and three columns name filters, and each square needs a current player on that row's team who also fits the column. You get nine guesses in total, a miss still burns a guess, and each player can be used once. Rarer squares pay more.`,
      `The players come from ${f.data}, covering ${f.scope}. The reveal shows other answers you could have used.`,
    ],
    tips: [
      'Fill the squares with the fewest possible answers first. They are the hardest to get later.',
      'Save common players for the squares with many options and avoid spending a star on an easy square.',
      'A miss costs a guess, so be sure before you commit.',
    ],
  }),
  mystery: (f, n) => ({
    about: [
      `${n} hides one starter and gives you eight guesses. You can name any active player. Every guess shows the team, division, position, age, jersey number, overall and height of the player you named, with arrows toward the answer, and "close" means you are near. After five guesses you also get the outline of his college.`,
      `The players come from ${f.data}, and the hidden one always rates 75 or better. Fewer guesses score higher.`,
    ],
    tips: [
      'Use the first guesses to learn the division and position, not to hit the answer. A guess that splits the field is worth more than a lucky one.',
      'Follow the arrows on rating, age and height. Each narrows a range, and together they pin a player down quickly.',
      'The college outline is a late clue. Plan to have the position settled before it appears.',
    ],
  }),
  'top-ten': (f, n) => ({
    about: [
      `${n} gives you one position and asks you to name its ten best before you strike out. You type a name and pick him from the list, a hit lands on the board at its rank, and a miss is a strike. Three strikes ends the game, and you can give up whenever you like. Each name earns 10 points, with 5 more for finding the number one.`,
      `The rankings come from ${f.data}, covering ${f.scope}.`,
    ],
    tips: [
      'Name the obvious stars first and keep your strikes for the middle of the list.',
      'Think about who is rated for what he does now, not for what he did. The list is current.',
      'Quit before the third strike if you have run out of names. The score keeps what you earned.',
    ],
  }),
  'rating-match': (f, n) => ({
    about: [
      `${n} shows five players from one position group and five lines of ratings: an overall and four key attributes. You tap a player and then a line to pair them, and tap a pair again to undo it. You have three attempts, and after each of the first two you learn how many pairs are right, not which ones. Each correct pair earns 10 points, minus five for each extra attempt you use.`,
      `The numbers come from ${f.data}.`,
    ],
    tips: [
      'Pair the lines you are most sure of first, and leave the doubtful ones for the end.',
      'Use the count of right pairs as information. If it goes down after a swap, the swap was wrong.',
      'Match the style: a line with high speed and low strength belongs to the quicker, lighter player.',
    ],
  }),
  'name-team': (f, n) => ({
    about: [
      `${n} hides a mystery team behind six clues. You start with one clue and guess any team. A miss drops the next clue. Solving on the first clue earns 6 points, on the sixth just 1, and six misses earns nothing.`,
      `The clues are built from ${f.data}.`,
    ],
    tips: [
      'Guess early when the first clue points somewhere. A correct first guess is worth six times a sixth-clue solve.',
      'Do not guess a team a previous clue rules out. Each clue removes teams for good.',
      'Think in divisions. A clue about a rival or a geography narrows you to four teams at once.',
    ],
  }),
  jersey: (f, n) => ({
    about: [
      `${n} names a team and a jersey number, and you tap which of three of that team's players wears it. There are eight rounds with eight different teams, and each hit is worth 100. The numbers show at the end. It tests the kind of detail only a fan of that team would know.`,
      `The numbers come from ${f.data}.`,
    ],
    tips: [
      'Think about positions. Quarterbacks and kickers usually wear low numbers and linemen higher ones, though the league has loosened its number rules in recent years.',
      'If you recognize one of the three by position, check whether his number range fits.',
      'Numbers in the 90s usually belong to defensive linemen or linebackers.',
    ],
  }),
  'compare-pair': (f, n, slug) => {
    const what = slug === 'speed-trap' ? { q: 'who is faster', unit: 'the Madden 27 Speed rating', note: 'Speed is rated on a 0 to 99 scale like every other attribute, and it is not the same as the forty-yard dash: it is the game\'s own measure of top-end speed.' }
      : slug === 'size-up' ? { q: 'who is taller', unit: 'listed height', note: 'Heights are the ones teams and the league list, in feet and inches, so a one-inch difference is a real answer.' }
      : { q: 'who has been in the league longer', unit: 'the number of NFL seasons played', note: 'Seasons count years on a roster, so a player drafted early is not always the veteran he looks like.' };
    return {
      about: [
        `${n} is a quick head-to-head. Each round shows two players, often at different positions, and asks ${what.q}, by ${what.unit}. There are eight rounds worth 100 points each, and the answers show at the end, so every game is also a small lesson in the numbers.`,
        `${what.note} The players come from ${f.data}, covering ${f.scope}.`,
      ],
      tips: [
        'Compare across positions with care. The two players are often at different positions, so think about what each position tends to look like.',
        'Trust your first read when it is clear. The close pairs are where a few seconds of thought pay off.',
        'Look at the reveal for the pairs you missed. They are the best way to learn the real spread.',
      ],
    };
  },
  'college-school': (f, n) => ({
    about: [
      `${n} shows a current pro and four colleges and asks where he played. There are five rounds, 100 points a hit and 25 more for every hit in a row. The answer shows right away, so each round teaches the next.`,
      `The players and schools come from ${f.data}.`,
    ],
    tips: [
      'Draft position helps: first-round picks often come from the biggest programs.',
      'Remember transfers. Some players finished at a different school from where they started.',
      'A streak is worth more than a single hit, so do not rush the early rounds.',
    ],
  }),
  nationality: (f, n) => ({
    about: [
      `${n} names a current player from a top league and four countries, and you pick the nation he represents. There are six rounds. The country is the one on his ESPN profile, which is the nation listed as his citizenship.`,
      `The players come from ${f.data}.`,
    ],
    tips: [
      'Think about the league\'s recruiting: many players come from a few countries, and the rest of the options are often there to mislead.',
      'A player\'s name is a clue but not a rule. Dual nationals and naturalized players are in the mix.',
      'Use the geography of the club\'s history. Some clubs have long ties to a particular country.',
    ],
  }),
  'league-pick': (f, n) => ({
    about: [
      `${n} names a current player from a recent goals or assists list and asks which league his club plays in: the Premier League, La Liga, Serie A, the Bundesliga, Ligue 1 or MLS. There are six rounds, and the reveal names his club.`,
      `The players come from ${f.data}.`,
    ],
    tips: [
      'Start from the club you know him for, then check whether he has moved.',
      'Remember that MLS is on the list. A star at the end of a career often moved there.',
      'If you cannot place him, think of which league the name sounds like. Rosters follow national lines.',
    ],
  }),
  'start-em': (f, n) => ({
    about: [
      `${n} shows two players at the same position and asks which one you would start. The answer is whoever has more PPR fantasy points per game. There are ten rounds, and ties count either way.`,
      `The numbers come from ${f.data}. They update after every game day.`,
    ],
    tips: [
      'Think about role and volume, not reputation. A steady 15 beats a fading star.',
      'Check recent form. The numbers weight the last four games heavily.',
      'Read the reveal. It shows which of your instincts the data supports.',
    ],
  }),
};

export function guideFor(slug: string): GameGuide | null {
  const entry = GAMES.find((g) => g.slug === slug);
  const family = familyOf(slug);
  if (!entry || !family) return null;
  const facts = factsFor(slug, entry.sport);
  const { about, tips } = TEXT[family](facts, entry.name, slug);
  return { name: entry.name, about, tips, read: readFor(slug, facts, family), more: moreFor(slug, entry.sport) };
}
