/**
 * Plain-language answers for the draft games, shown under each game and sent as FAQPage data. Written
 * answer-first so search and AI answer engines can quote them as they are. Every number here is the live rule;
 * change it here when the rule changes.
 */
export interface GameFaq { slug: string; name: string; sport: string; summary: string; qa: { q: string; a: string }[] }

export const GAME_FAQ: Record<'17-0' | '82-0' | '162-0' | '44-0', GameFaq> = {
  '17-0': {
    slug: '17-0', name: '17-0', sport: 'NFL',
    summary: 'A free NFL draft game: each spin lands on a franchise, you take one player from it for an open roster spot, and the finished roster is graded and played through a 17-game season.',
    qa: [
      { q: 'What is 17-0?', a: '17-0 is a free NFL draft game. Each spin lands on a team, you draft one player from that team into an open spot, and when the roster is full it plays a projected 17-game season. The goal is a perfect 17-0.' },
      { q: 'How are players graded in 17-0?', a: 'Players are graded on EA Sports Madden NFL ratings, weighted by what matters at their position (blocking for linemen, coverage for corners). Head coaches are graded on their real career results. Quarterback carries the most weight in every roster size.' },
      { q: 'What roster sizes can I play?', a: 'The classic six (QB, RB, WR, TE, one defender and a head coach), a 12-man and a 16-man roster, a Fantasy lineup scored on real PPR points, and a full 53-man roster plus coach where teams come around again and backups count a little.' },
      { q: 'How many re-rolls do I get?', a: 'Two re-rolls in Easy mode (five in the 53-man game). Hard mode hides the ratings, makes you type player names, and gives no re-rolls.' },
      { q: 'How hard is it to go 17-0?', a: 'The win line is set from how real players actually do, not just a formula: each night it is nudged so the best tenth of Casual drafters land around 15-2. A perfect 17-0 is rarer than that, and people who use the re-rolls well still miss it more often than they hit it. All-time mode has its own win line, set the same way.' },
      { q: 'Are there all-time head coaches?', a: 'Yes. All-time mode puts each franchise\'s legendary head coaches next to its current one: Belichick with the Patriots, Shula with the Dolphins, Lombardi with the Packers, Walsh and Seifert with the 49ers, Paul Brown with the Browns, Noll with the Steelers and about sixty more, so every franchise has at least one. A legend is graded on his record with that franchise: winning percentage, titles, playoff trips and years, on the same 80 to 99 scale as today\'s coaches, and counts only for the team you spun. His seasons and record show on his row.' },
      { q: 'What is the daily game?', a: 'Today is one shared board for everyone, the classic six with current rosters, ranked on the daily leaderboard. You get one ranked try per day. Casual games are unlimited.' },
      { q: 'Can I draft the same player twice?', a: 'No. A player can show up on more than one board, like an All-time legend who starred for two franchises, but once he is on your roster he is left off every board after that.' },
      { q: 'Is there a leaderboard for perfect seasons?', a: 'Yes. Open the leaderboard, pick 17-0 and choose Undefeated. It ranks players by how many times they have gone 17-0, in Today and Casual. Casual perfect seasons count up to five a day.' },
    ],
  },
  '82-0': {
    slug: '82-0', name: '82-0', sport: 'NBA',
    summary: 'A free NBA draft game: five spins, each an era and then a franchise. Draft one player from each, graded on his real stats from his best season there, and see if the lineup goes 82-0.',
    qa: [
      { q: 'What is 82-0?', a: '82-0 is a free NBA draft game. Each of five spins lands on an era (the \'80s through the \'20s) and then a franchise. You draft one player from that team in that era, set a starting five, and the lineup plays a projected 82-game season.' },
      { q: 'How are players rated in 82-0?', a: 'Every player on a board is shown at his best season with that franchise in that era, from real per-game stats (ESPN, 1984-85 onward). The rating blends points, rebounds, assists, steals and blocks, minus turnovers, plus shooting efficiency. The top of the 40-99 scale is bent, so only the greatest seasons ever sit near 99.' },
      { q: 'Can I pick the same era twice?', a: 'No. Like the original 82-0, each era can be used once, so your five picks come from five different eras.' },
      { q: 'How many re-spins do I get?', a: 'Two era re-spins and two team re-spins in Easy mode. Hard mode hides the stats and gives no re-spins.' },
      { q: 'Does position matter?', a: 'Yes. A player can play any spot, but out of position he keeps 94 percent of his value one spot over, 82 percent two spots over, and 70 percent beyond that.' },
      { q: 'How hard is it to go 82-0?', a: 'The win line is fitted to the real data so a careful drafter using every re-spin goes 82-0 about 3 percent of the time.' },
      { q: 'What is Standard mode?', a: 'Standard grades today\'s NBA rosters on current NBA 2K overall ratings instead of historical stats. Classic is the default.' },
      { q: 'Can I draft the same player twice?', a: 'No. A star who played for several teams can show up on more than one board, but once he is on your roster he is greyed out on every board after that.' },
      { q: 'Is there a leaderboard for perfect seasons?', a: 'Yes. Open the leaderboard, pick 82-0 and choose Undefeated. It ranks players by how many times they have gone 82-0, in Today and Casual. Casual perfect seasons count up to five a day.' },
    ],
  },
  '162-0': {
    slug: '162-0', name: '162-0', sport: 'MLB',
    summary: 'A free MLB draft game: eleven spins, each an era since 1970 and then a franchise. Fill a lineup, a starter and a closer from real seasons and see if the roster goes 162-0.',
    qa: [
      { q: 'What is 162-0?', a: '162-0 is a free MLB draft game. Each of eleven spins lands on an era since 1970 and a franchise. You fill C, 1B, 2B, 3B, SS, three outfielders, DH, a starting pitcher and a reliever, and the roster plays a projected 162-game season.' },
      { q: 'How are players rated in 162-0?', a: 'Hitters are graded on OPS against that season\'s league average, playing time, speed and how hard their position is to fill. Pitchers are graded on ERA against the league, innings or saves, and strikeouts. Data comes from MLB\'s public Stats API.' },
      { q: 'Can I pick the same era more than once?', a: 'Up to twice. No era can give more than two of your eleven picks.' },
      { q: 'How many re-spins do I get?', a: 'Two era re-spins and two team re-spins in Easy mode. Hard mode hides the stats and gives no re-spins.' },
      { q: 'What is Right now mode?', a: 'Right now skips the era and spins teams from the current season only, graded on this year\'s stats.' },
      { q: 'How hard is it to go 162-0?', a: 'The win line is fitted so a careful drafter using every re-spin goes 162-0 about 2 percent of the time.' },
      { q: 'Can I draft the same player twice?', a: 'No. A player who spent time with several clubs can show up on more than one board, but once he is on your roster he is greyed out on every board after that.' },
      { q: 'Is there a leaderboard for perfect seasons?', a: 'Yes. Open the leaderboard, pick 162-0 and choose Undefeated. It ranks players by how many times they have gone 162-0, in Today and Casual. Casual perfect seasons count up to five a day.' },
    ],
  },
  '44-0': {
    slug: '44-0', name: '44-0', sport: 'WNBA',
    summary: 'A free WNBA draft game: five spins, each landing on a franchise. Draft one player from each, graded on her real stats from this season, and see if the lineup goes 44-0.',
    qa: [
      { q: 'What is 44-0?', a: '44-0 is a free WNBA draft game. Each of five spins lands on a franchise from the current season. You draft one player from that team, set a starting five, and the lineup plays a projected 44-game season, the length of the current WNBA schedule.' },
      { q: 'How are players rated in 44-0?', a: 'Every player on a board is shown with her current-season line, from real per-game stats (ESPN). The rating blends points, rebounds, assists, steals and blocks, minus turnovers, plus shooting efficiency. The top of the 40-99 scale is bent, so only the greatest seasons sit near 99.' },
      { q: 'Are there all-time teams?', a: 'Not any more. 44-0 now drafts from this season only, so the ratings stay current.' },
      { q: 'How many re-spins do I get?', a: 'Two team re-spins in Easy mode. Hard mode hides the stats and gives no re-spins.' },
      { q: 'Does position matter?', a: 'Yes. A player can play any spot, but out of position she keeps 94 percent of her value one spot over, 82 percent two spots over, and 70 percent beyond that. A forward who averages five assists a game can play the point at no cost. The league lists players only as guard, forward or center, so a center counts as a power forward too. ESPN has no position at all for most players before 2010, so those seasons are placed from the stat line: guards pass and steal, centers rebound and block, and a player between two reads as guard-forward or forward-center and fills both.' },
      { q: 'How hard is it to go 44-0?', a: 'The win line is fitted to the real data so a careful drafter using every re-spin goes 44-0 about 3 percent of the time.' },
      { q: 'Can I draft the same player twice?', a: 'No. A player who played for several franchises can show up on more than one board, but once she is on your roster she is greyed out on every board after that.' },
      { q: 'Is there a leaderboard for perfect seasons?', a: 'Yes. Open the leaderboard, pick 44-0 and choose Undefeated. It ranks players by how many times they have gone 44-0, in Today and Casual. Casual perfect seasons count up to five a day.' },
    ],
  },
};
