// What changed on the site and when, newest first. Shown at /updates. Keep copy plain and free of em-dashes and en-dashes.
// Add a line when something ships: a new game, a rule or formula change, a fix people would notice. Dates are the day it went out.

export interface Update { date: string; title: string; body: string }

/** The day the repository began. Nothing on the site, a blog post included, may carry an earlier date. */
export const SITE_STARTED = '2026-09-28';

export const UPDATES: Update[] = [
  {
    date: '2026-10-27',
    title: 'More to read, and the numbers checked',
    body: 'The blog grows to 31 posts that explain how every grade, win line and odds table is built, with worked examples. Every quick game page now has a written guide under the game. Team and coach pages show how a roster ranks by unit and what the coach slot is worth in wins. Wrong figures on the home page, the per-team 17-0 FAQ and the coaches pages were corrected. About and Updates are now linked from every page.',
  },
  {
    date: '2026-10-18',
    title: 'A harder 17-0, one copy of each player, Undefeated boards',
    body: 'The nightly balance now aims the best tenth of 17-0 runs at 15-2 instead of 16-1, so perfect seasons are rarer. A roster can hold the same person once in every draft game. Leaderboards get an Undefeated view for 17-0, 82-0, 162-0 and 44-0.',
  },
  {
    date: '2026-10-14',
    title: 'Cleaner boards and fantasy fixes',
    body: 'Leaderboard rows are one clean pill per player. The team wheel in 82-0, 44-0 and 162-0 lists only franchises that can really be drawn. The waiver wire stops listing stars, fantasy points say what the big number means, and position pages say they rank today\'s ratings.',
  },
  {
    date: '2026-10-13',
    title: 'WNBA 44-0, college Build a Player, 68 legendary coaches',
    body: '44-0 brings the draft game to the WNBA, with challenges for friends. Build a Player comes to college football and to men\'s and women\'s college basketball. 17-0 All-time adds 68 franchise head coaches, each graded on his record with that team.',
  },
  {
    date: '2026-10-12',
    title: 'College games, Sports Strands, free shop drops',
    body: 'Higher or Lower, Blind Resume, Who Led and Whose Team arrive for college football and for men\'s and women\'s college basketball. Sports Strands joins the daily puzzles. The shop gets free timed drops, there are 70 achievements with some hidden, and the fantasy hub is rebuilt. Difficulty is balanced each night from real results.',
  },
  {
    date: '2026-10-09',
    title: '53-man 17-0, Build a Soccer Player, WNBA games',
    body: '17-0 can be played with a full 53-man roster and a depth chart. Build a Soccer Player and four WNBA games arrive. 82-0 and 162-0 get harder and replay the season on the result page. 17-0 All-time deepens its list of greats.',
  },
  {
    date: '2026-10-05',
    title: 'Start \'Em and two more Rank \'Em games',
    body: 'Start \'Em asks which of two fantasy players you would start. Rank \'Em gets a fantasy version and a baseball version.',
  },
  {
    date: '2026-10-04',
    title: 'Sports Crossword and profile badges',
    body: 'A daily mini crossword, ranked by time, joins the puzzles. Profiles show badges earned from real play, and one day a week pays double points for ranked games.',
  },
  {
    date: '2026-10-03',
    title: 'Fantasy hub, trade calculator and cheat sheet',
    body: 'The fantasy hub opens with rankings, a waiver wire, a trade calculator, a printable draft cheat sheet, a draft order randomizer and a tier list maker. Values follow recent form instead of the season average alone.',
  },
  {
    date: '2026-10-03',
    title: 'Baseball, soccer and NBA 2K',
    body: '162-0 drafts an MLB lineup from real seasons since 1970. Four soccer games arrive on a new Soccer tab, with a daily sync of six leagues. 82-0 gets a Standard edition on NBA 2K ratings, and three NBA 2K games follow. 17-0 All-time is rebuilt from ESPN history so every franchise has legends at every stat position.',
  },
  {
    date: '2026-10-03',
    title: 'Points, the shop, puzzles, Pick \'em and challenges',
    body: 'Playing earns points that buy name colors, fonts, avatar rings and banners. Every game gets a leaderboard for Today, this week and all time. Sports Connections and Sportle arrive as daily puzzles, Top 100 lists are added for the NFL, NBA and MLB, weekly NFL Pick \'em locks at kickoff, and challenges let a friend play the exact same spins.',
  },
  {
    date: '2026-10-02',
    title: 'playunbeaten.com, and 82-0 for basketball',
    body: 'The site moves to playunbeaten.com. 82-0 drafts an NBA starting five across five eras, graded on real stats from 1984-85 on, with four basketball mini games. 17-0 gets 6, 12 and 16 man rosters, a Fantasy edition scored on real points, and a Hard setting with no re-rolls.',
  },
  {
    date: '2026-09-30',
    title: 'The first release',
    body: 'Unbeaten opens with 17-0, Build a Player and ten daily football games, each with a ranked Today board and unlimited Casual play. Ratings come from EA\'s Madden 27 ratings, and rosters and head coaches from ESPN.',
  },
];
