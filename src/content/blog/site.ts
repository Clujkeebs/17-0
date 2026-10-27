// How the site itself works: ranked and Casual play, points, Pick 'em, challenges, sources and a glossary.
// Point values come from src/lib/server/points.ts and src/lib/server/challenges.ts. Change them here when they change there.
import type { BlogPost } from './types';

export const SITE_POSTS: BlogPost[] = [
  {
    slug: 'today-and-casual-how-ranked-play-works',
    title: 'Today and Casual: how ranked play, boards and streaks work',
    date: '2026-10-27',
    category: 'How the site works',
    excerpt: 'One ranked try a day on a shared board, unlimited Casual games, three leaderboard views, the Undefeated board and the streaks that tie them together.',
    sections: [
      {
        h2: 'Two ways to play every game',
        paragraphs: [
          `Every draft game and daily puzzle on the site has two modes. Today is the ranked game: one shared board for everyone, one try a day, an account required. Casual is the practice-free version: a fresh board every time, as many games as you like. We call it Casual, not practice, because the games count for points and for perfect-season totals.`,
          `Today resets at midnight Eastern for everyone, whatever their time zone. The board is generated from the date, so every player who opens a given game on a given day gets the same teams in the same order, and the same results on any re-spins. That is what makes the daily leaderboard a fair comparison: same board, different decisions.`,
        ],
      },
      {
        h2: 'What Casual is for',
        paragraphs: [
          `Casual is where you learn the games and where most of the play happens. It has the full set of options: roster sizes, All-time and current pools, Easy and Hard, Right now and Eras. Nothing in it can hurt your Today result, and nothing in it ranks you on a daily board.`,
          `It is also where the harder modes live. Some options, such as the larger rosters and All-time mode, are Casual only, because the ranked board has to be the same for everyone. If you want to practice for Today, play a Casual game in the same format first.`,
        ],
      },
      {
        h2: 'The leaderboards',
        paragraphs: [
          `Each game has three views: Today, This week and All time. Each shows a player's best ranked result for that period. Games with a Hard mode also have a Hard filter that shows only the players who drafted without ratings. There is also an Overall table that ranks everyone by points across all games.`,
          `Draft games have a fourth view, Undefeated, which ranks players by how many perfect seasons they have. Today perfect seasons always count. Casual perfect seasons count up to five per game per day, which stops anyone from inflating the number by replaying until a lucky board turns up. Results flagged as suspicious, and accounts the site's owner has removed from boards, are left out.`,
        ],
      },
      {
        h2: 'Points',
        paragraphs: [
          `Points are the site's way of saying thanks for playing. A ranked game pays 10 points. A Casual game pays 2, for the first 25 Casual games of the day. A perfect result pays a bonus: 25 points for a perfect puzzle and 75 for a perfect season in a draft game when ranked, and 10 and 25 in Casual, up to five a day.`,
        ],
        table: {
          caption: 'How points are earned',
          head: ['Source', 'Points'],
          rows: [
            ['A welcome bonus when you create an account', '50'],
            ['A ranked (Today) game', '10'],
            ['A Casual game (first 25 a day)', '2'],
            ['A perfect ranked puzzle / perfect ranked season', '25 / 75'],
            ['A perfect Casual puzzle / perfect Casual season (up to 5 a day)', '10 / 25'],
            ['A 3, 7, 14, 30, 50 or 100 day streak', '15, 40, 100, 250, 400 or 1,000'],
            ['Top ten on a daily board, first to tenth', '50, 35, 25, 20, 15, 12, 10, 10, 10, 10'],
            ['Top three of the week', '150, 100, 60'],
          ],
        },
        closing: [
          `On one day each week, ranked games pay double. Points are paid once per game and once per day for the board payouts, so a retry, a double click or a repeated job cannot pay twice. The [points and shop post](/blog/points-and-the-shop-how-they-work) covers what they buy.`,
        ],
      },
      {
        h2: 'After you play Today',
        paragraphs: [
          `A Today result is final. You cannot replay the day's board for a better score, which is what keeps the ranking honest. Once you have played Today in a game, the game page offers a Casual game instead, so you are never at a dead end, and your Today result stays on the board.`,
          `Casual needs no account, so a friend can try a game before signing up. Today does need one, because a ranked board has to have names on it and one try per person has to mean one person.`,
        ],
      },
      {
        h2: 'Streaks',
        paragraphs: [
          `A streak is the number of days in a row on which you finished at least one ranked game. Miss a day and it starts over. The milestones at 3, 7, 14, 30, 50 and 100 days pay points, and the longest streak you have reached counts toward achievements on your profile.`,
          `Because Today is one shared board, a streak is also a record of showing up. You do not have to be good to keep one. You have to finish the day's game.`,
        ],
      },
      {
        h2: 'Accounts and privacy',
        paragraphs: [
          `Signing up takes a username and a password. An email is optional and is only used for password recovery and the newsletter if you ask for it. Leaderboards show usernames only. There is no chat, no messaging and no user uploads other than a profile picture. The [privacy page](/legal/privacy) lists exactly what is stored and for how long.`,
        ],
      },
    ],
  },

  {
    slug: 'points-and-the-shop-how-they-work',
    title: 'Points and the shop: what they buy and what they do not',
    date: '2026-10-27',
    category: 'How the site works',
    excerpt: 'Points come from playing and buy how your name looks on leaderboards and profiles. They have no cash value, cannot be bought, and never change a result.',
    sections: [
      {
        h2: 'What the shop sells',
        paragraphs: [
          `The [shop](/shop) sells how your name looks. Items fall into seven kinds: name colors, name fonts, avatar borders, banners, titles, flair and effects. A color or a font changes how your username is drawn. A border goes around your picture. A banner sits behind your name on your profile and, as a soft tint, on leaderboard rows. A title is a small label next to your name. An effect adds motion.`,
          `Nothing in the shop touches how a game is played or graded. A gold name does not get a better board, a better roll or a better grade. It is a way to look the way you want to look on a list of people who also play.`,
        ],
      },
      {
        h2: 'No cash value',
        paragraphs: [
          `Points cannot be bought with money, sold, traded or cashed out. There is no way to pay to get more of them, and the site does not offer any. The only way to earn them is to play, as the [ranked play post](/blog/today-and-casual-how-ranked-play-works) explains. This is also why there are no prizes for results: nothing on the site has a dollar value, and nothing here is a contest.`,
        ],
      },
      {
        h2: 'Limited editions',
        paragraphs: [
          `Some items are limited editions with a fixed number of copies, such as launch colors and engraved fonts. The shop shows how many are left. Each purchase happens in a single database transaction that checks the stock first, so two people buying the last copy at the same moment cannot both get it. Once a limited item is sold out it is gone.`,
          `A few items are free. The site occasionally runs free drops with a short window to claim them, and every account gets a set of basic items from the start.`,
        ],
      },
      {
        h2: 'How a purchase works',
        paragraphs: [
          `Buying an item subtracts its price from your balance and adds it to your collection in one step. You can equip one item of each kind at a time, and change them whenever you like. Every point you earn or spend is a row in a ledger, with a reason and a reference, and a grant for the same reason and reference is only paid once. If a job runs twice, you are not paid twice.`,
          `The balance on the shop page is the sum of that ledger. If you think a number is wrong, the ledger is how it gets checked, and [contacting us](/contact) with the date and the game is enough to look.`,
        ],
      },
      {
        h2: 'Where your style shows up',
        paragraphs: [
          `Your equipped items appear on leaderboard rows, your profile, your public profile page and challenge tables. Boards use light versions of the art: a soft tint in the banner's colors behind the name, a ring in the border's colors around the picture, and a small chip for the title. That keeps a board of a hundred rows fast to load. Your profile and the shop show the full drawings.`,
        ],
      },
      {
        h2: 'Fair play',
        paragraphs: [
          `A points system only works if it cannot be farmed. Casual games pay for the first 25 of the day and Casual perfect seasons for the first five, so replaying one game a thousand times earns nothing extra. Results that the site flags as suspicious do not appear on boards or in Undefeated totals, and accounts can be removed from boards. Grants are idempotent, which means a retry or a repeated job cannot pay twice.`,
        ],
      },
      {
        h2: 'Why have a shop at all',
        paragraphs: [
          `Leaderboards are better when the names on them are people. A shop gives players a reason to come back that is separate from the competition, and a way to be recognized for sticking around that does not depend on being the best. A name with a seven-day-streak border says something about you. It does not say you are good, and it does not need to.`,
        ],
      },
      {
        h2: 'Choosing what to buy',
        paragraphs: [
          `Think about where people will see it. A name color and a name font appear on every leaderboard row and every list, so they are seen the most. A border goes around your picture in the same places. A banner shows in full on your profile and as a soft tint on rows. A title is a small label that says something about you. An effect adds motion to your name and is the most noticeable of all.`,
          `If you only care about leaderboards, a color and a border are the best value. If you want your profile to look like yours, a banner and a title. Limited editions are the only items that can run out, so if there is one you want, that is the one to buy first. Everything else will still be there next week.`,
        ],
      },
    ],
  },

  {
    slug: 'pick-em-guide-weekly-nfl-picks',
    title: 'Pick \'em: how weekly NFL picks work and how to play them',
    date: '2026-10-27',
    category: 'How the site works',
    excerpt: 'Choose the winner of every game before kickoff. Points for each right pick, a bonus for a perfect week, and the arithmetic of how rare a perfect week is.',
    sections: [
      {
        h2: 'The rules',
        paragraphs: [
          `[Pick \'em](/pickem) lists every NFL game of the week, pulled from ESPN's scoreboard. You tap the team you think wins. You can change your mind as often as you like until that game kicks off, and then the pick locks. The lock is checked on the server against the kickoff time, so a pick cannot be changed after the game has started, whatever your device says.`,
          `When a game is final, everyone who picked the winner earns 10 points, once. If every game of a week is final and you picked all of them right, you earn a 50 point bonus. A tie pays nothing to either side. Standings show the week and the season, and your own page shows your record as rights, wrongs and a percentage.`,
        ],
      },
      {
        h2: 'There is no spread',
        paragraphs: [
          `Pick \'em on this site is straight up: you pick the winner, with no point spread and no odds. That is deliberate. Nothing here is a bet, nothing has a dollar value, and there are no prizes. It is a way to keep score on how well you know the league.`,
        ],
      },
      {
        h2: 'The math of a perfect week',
        paragraphs: [
          `Most weeks have between 13 and 16 games. If you pick each game right with probability p, the chance of a perfect week is p to the power of the number of games. At 16 games, a 65 percent pick rate gives a perfect week about one time in a thousand. At 75 percent it is one in a hundred, at 80 percent about one in 36, and at 90 percent about one in five and a half.`,
        ],
        table: {
          caption: 'Chance of a perfect week in a 16-game slate, by your chance of being right on each game',
          head: ['Per-game accuracy', 'Chance of a perfect week', 'Expected right picks of 16'],
          rows: [
            ['60%', '1 in 3,500', '9.6'],
            ['65%', '1 in 1,000', '10.4'],
            ['70%', '1 in 300', '11.2'],
            ['75%', '1 in 100', '12.0'],
            ['80%', '1 in 36', '12.8'],
            ['90%', '1 in 5.4', '14.4'],
          ],
        },
        closing: [
          `The bonus is a long shot for everyone, and the sensible way to play is for the 10 points a pick. Expect to be right on roughly two games in three if you follow the league closely, and take the bonus if it comes.`,
        ],
      },
      {
        h2: 'A weekly rhythm',
        paragraphs: [
          `The slate for a week appears once ESPN publishes it, normally early in the week. Each game locks at its own kickoff, so you can make your Thursday pick on Thursday and still change your Sunday picks on Sunday morning. The results come in as games end, and your points are paid once when a game is final.`,
          `Short weeks, bye weeks and late schedule changes all work the same way, because the lock follows each game's real kickoff time. A perfect week means every game on that week's slate, and it is only awarded once every one of them is final.`,
        ],
      },
      {
        h2: 'Habits that help',
        paragraphs: [
          `Favorites win most of the time, which is why they are favorites, so start from the better team and ask whether you have a reason to leave. Good reasons are specific: a key injury you have confirmed, a quarterback change, a short week, a game that matters more to one team than the other. Bad reasons are vague: a feeling, a streak, a team you like.`,
        ],
        list: [
          `Check the injury reports closer to kickoff. The picks stay open until then, and the information improves.`,
          `Be careful with the home field. It matters, but less than people assume, and it is smaller than the gap between a good team and a bad one.`,
          `Do not chase upsets. A pick that is right one time in three is a bad pick, however good it feels when it hits.`,
          `Make all your picks, including the games you do not care about. An unpicked game scores nothing.`,
        ],
        closing: [
          `If you want to see how you stack up, the standings show the best records of the week and the season. The weekly standings are a good place to see how often a perfect record comes up in practice. Check it against the table above.`,
        ],
      },
      {
        h2: 'Reading your record',
        paragraphs: [
          `The regular season has 272 games: 17 for each of 32 teams, two teams to a game. If you pick 65 percent of them right, that is about 177 correct picks and about 1,770 points over the year, before any perfect-week bonus. A 70 percent picker gets about 190, which is 14 more right and 140 more points. Those gaps look small week to week and add up over a season, which is why your percentage is the number to watch, not a single week.`,
          `A bad week means little. Even a careful picker has a week at 8 of 15 now and then, because single games are noisy. A season at 62 percent and a season at 68 percent are separated by about 16 games out of 272. Judge your picks by the reasons you had for them, not by how a single Sunday turned out.`,
        ],
      },
    ],
  },

  {
    slug: 'challenges-same-spins-head-to-head',
    title: 'Challenges: send a friend the exact same spins',
    date: '2026-10-27',
    category: 'How the site works',
    excerpt: 'Finish a Casual game, send a link, and a friend drafts from the same teams in the same order. How it works, what is hidden, and how the points are paid.',
    sections: [
      {
        h2: 'What a challenge is',
        paragraphs: [
          `After a Casual game of 17-0, 82-0, 162-0 or 44-0, the result page offers a Challenge button. It creates a link. Anyone who opens it gets the same game you played: the same seed, the same setup, so the same first team, and the same teams and eras after every re-roll or re-spin. They draft their own roster from the same boards, and the page ranks everyone who played it.`,
          `Today results cannot be challenged, because that would preview the ranked board before others had played it. Only Casual games can, and the seed of a Casual game reveals nothing that matters.`,
        ],
      },
      {
        h2: 'Why identical spins make a fair fight',
        paragraphs: [
          `A draft game has two sources of difference between players: the board and the choices. A challenge removes the first. If you and a friend both see the same six teams and the same re-rolls, then the one who wins made better decisions. It is the closest thing in the games to a head-to-head match.`,
          `The season itself is also settled by the roster. For a challenge game, the season's luck is drawn from the challenge seed and the picks, not from a random session id, so two identical rosters always get the same record. The only way to win is to draft better.`,
        ],
      },
      {
        h2: 'What stays hidden',
        paragraphs: [
          `Your roster stays hidden from the friends you challenge until they have finished their own. Otherwise the first thing a new player would do is copy it. Once they finish, a side-by-side card shows both rosters slot by slot, with each player's value and fit, so you can see exactly where the difference came from.`,
          `Only signed-in players appear on the entrant table. Guests can still play a challenge and see how they did against you on their own result page.`,
        ],
      },
      {
        h2: 'Points',
        paragraphs: [
          `Beating the creator's score earns 25 points. If someone else plays your challenge and loses to you, you earn 10 points for defending, up to five defenses per challenge. Each payout is made once per player, so you cannot farm a challenge by replaying it, and hidden players are excluded.`,
          `The ranking on a challenge page is by wins, then by lineup strength, then by who finished first, so a tie goes to the earlier entry.`,
        ],
      },
      {
        h2: 'How to start one',
        paragraphs: [
          `There is nothing to set up. The steps are the same in every draft game.`,
        ],
        list: [
          `Finish a Casual game of 17-0, 82-0, 162-0 or 44-0.`,
          `On the result page, press the Challenge button. The site makes one short link for that result and reuses it if you press again.`,
          `Send the link. It opens a page showing the game, its setup (roster size, pool or mode), your record and a Play button. You do not need an account to send or open a link.`,
          `Each friend plays. The page fills with entrants, best first. An account is only needed to appear on the table and to earn points.`,
        ],
      },
      {
        h2: 'A worked example, with invented rosters',
        paragraphs: [
          `Two friends play a 17-0 challenge. Both see the same six teams and the same two re-rolls. The side-by-side card shows where the difference came from. Here is one, with invented grades. The friend took a different quarterback on the first spin, a 92 where the creator took a 78.`,
        ],
        table: {
          caption: 'Slot-by-slot difference between two rosters in an invented challenge',
          head: ['Slot', 'Creator', 'Friend', 'Change in team strength'],
          rows: [
            ['Quarterback (30%)', '78', '92', '+4.20'],
            ['Wide receiver (22%)', '90', '85', '-1.10'],
            ['Running back (18%)', '84', '84', '0.00'],
            ['Defense (13%)', '88', '86', '-0.26'],
            ['Head coach (9%)', '86', '90', '+0.36'],
            ['Tight end (8%)', '80', '76', '-0.32'],
          ],
        },
        closing: [
          `The friend gives back some strength at receiver, defense and tight end, and wins it back and more at quarterback. The net is plus 2.88 points of strength, which is about two projected wins. The card turns an argument about who got the better board into a column of numbers, and since the boards were the same, the numbers are the whole story.`,
        ],
      },
      {
        h2: 'Questions people ask',
        paragraphs: [
          `A few things come up every time.`,
        ],
        list: [
          `Can I challenge a Today result? No. Today is the ranked board, and a challenge would let someone preview it.`,
          `Can the same person enter twice? Each signed-in player has one entry per challenge.`,
          `Do challenge games count toward Undefeated totals? They are Casual games, so yes, under the same cap of five perfect seasons a day.`,
          `Does it work for the WNBA game? Yes. 44-0 has challenges like the others.`,
        ],
      },
      {
        h2: 'Tips for challenging',
        paragraphs: [
          `Pick your best game, not your last one. A friend who beats a 15-2 has done something. Before you share, look at where your roster was weakest, since that is what a smart opponent will try to avoid.`,
          `Share in a group chat, and challenge someone who plays the same game. The link carries the whole setup, so there is nothing to explain. The [ranked play post](/blog/today-and-casual-how-ranked-play-works) has more on how Casual games count.`,
        ],
      },
    ],
  },

  {
    slug: 'where-our-data-comes-from',
    title: 'Where our data comes from, and how we keep it honest',
    date: '2026-10-27',
    category: 'How the site works',
    excerpt: 'Every rating, stat line and roster on the site comes from a named public source. What each source is, how often it refreshes, and what we do when we are wrong.',
    sections: [
      {
        h2: 'The sources',
        paragraphs: [
          `Nothing on this site is invented. Each number comes from a named public source and is refreshed on a schedule. Football player ratings come from EA Sports Madden NFL's official ratings pages. Football rosters, head coaches, historical season leaders and weekly scores come from ESPN's public data. NBA and WNBA per-game stats come from ESPN. MLB seasons come from MLB's public Stats API. Soccer clubs, rosters and scoring leaders come from ESPN. Current NBA 2K overall ratings come from NBA2KLab's public ratings table and are credited wherever they are used.`,
          `Fantasy football values blend recent weekly points, the season so far and, early in the year, projections, using Sleeper's public data, with roster percentages from ESPN. Pick \'em schedules and results come from ESPN's scoreboard. Free-licensed soccer photos come from Wikimedia Commons and are credited on the [credits page](/credits).`,
        ],
      },
      {
        h2: 'How often it changes',
        paragraphs: [
          `Football ratings are refreshed weekly, and rosters and coaches are kept current from ESPN, so a traded player moves teams once the roster updates. Fantasy points refresh on Monday, Tuesday and Friday mornings, after Sunday's games, Monday night and Thursday night. Add counts for the waiver wire refresh every few hours. Basketball and baseball history is stored once per finished season and refreshed for the current one. When a refresh goes stale, a banner at the top of the site says so, with the date of the last successful update.`,
        ],
      },
      {
        h2: 'At a glance',
        paragraphs: [
          `The sources and what we take from each, in one table.`,
        ],
        table: {
          caption: 'Data sources and what each one provides',
          head: ['Source', 'What we use it for', 'How it refreshes'],
          rows: [
            ['EA Sports Madden NFL ratings', 'Football player ratings and attributes', 'Weekly'],
            ['ESPN, football', 'Rosters, head coaches, season leaders since 1980, weekly scores', 'Rosters regularly; scores every 20 minutes during the season'],
            ['ESPN, basketball', 'NBA and WNBA per-game stats by season', 'Finished seasons stored once; current season refreshed'],
            ['MLB Stats API', 'MLB seasons since 1970', 'Finished seasons stored once; current season refreshed'],
            ['NBA2KLab', 'Current NBA 2K overall ratings', 'With the regular NBA refresh'],
            ['Sleeper and ESPN', 'Fantasy points, add counts and roster percentages', 'Points Monday, Tuesday and Friday; adds every few hours'],
            ['Wikimedia Commons', 'Free-licensed soccer photos', 'Credited on the credits page'],
          ],
        },
        closing: [
          `If a source changes or disappears, the part of the site that depends on it says so or turns off, instead of showing old numbers as if they were new.`,
        ],
      },
      {
        h2: 'What is ours',
        paragraphs: [
          `The sources give us raw numbers. The grades, the win lines and the rankings are ours, and every formula is published: the position formulas on the [positions pages](/positions), the basketball and baseball season ratings in the [82-0](/blog/how-82-0-rates-a-player-season) and [162-0](/blog/how-162-0-grades-hitters-and-pitchers) posts, the coach score in its [own post](/blog/coach-impact-score-explained) and the fantasy values in the [fantasy posts](/blog/value-over-replacement-fantasy-football-explained). A shared, fixed scale is what makes the leaderboard fair, even where a rating is arguable.`,
          `We also do not use anyone's data to imply an endorsement. Unbeaten is an independent fan project and is not affiliated with EA Sports, ESPN, the NFL, the NBA, the WNBA, MLB or any team or league. The [disclaimer](/legal/disclaimer) says so in full.`,
        ],
      },
      {
        h2: 'What we do not do',
        paragraphs: [
          `There is no gambling on the site and nothing that implies it: no odds, no lines, no prizes and no links to sportsbooks. The simulated seasons are fiction, and the site does not claim to predict real games. Ads, once approved, will stay small and to the side, never inside a game and never on phones. We do not sell personal data, and we do not run third-party analytics.`,
        ],
      },
      {
        h2: 'When we are wrong',
        paragraphs: [
          `We will be, sometimes. A traded player can be on the wrong team for a day, a rating can be out of date, a formula can have a bug. When a reader tells us, we check it against the source, fix it, and if it changed a published post we note the date on the post. The feedback box on the site and the [contact page](/contact) both reach the people who run it.`,
          `Many of the best fixes on this site started as one line from a player: a missing star, a wrong team, a pick that did not look right. If you see something, say so.`,
        ],
      },
      {
        h2: 'Photos and trademarks',
        paragraphs: [
          `Team logos and player photos come from public team and league sources and are used to identify the players and teams the games are about. Where those sources have no photo, soccer players get a free-licensed photo from Wikimedia Commons, credited on the [credits page](/credits). Team names and logos belong to their owners, and nothing here is endorsed by them.`,
          `If you own a photo or a mark and want it removed, the [DMCA page](/legal/dmca) explains how to tell us. We act on a valid notice quickly and would rather replace an image with a monogram than keep one anyone objects to.`,
        ],
      },
    ],
  },

  {
    slug: 'unbeaten-glossary',
    title: 'The Unbeaten glossary: every term used on the site',
    date: '2026-10-27',
    category: 'How the site works',
    excerpt: 'Re-roll, re-spin, fit, grade, win line, replacement level, spangram and the rest, defined in plain language with links to where each one matters.',
    sections: [
      {
        h2: 'Game modes and terms',
        paragraphs: [
          `Terms for how the games are played.`,
        ],
        list: [
          `Today: the ranked daily game. One shared board, one try, an account required. Resets at midnight Eastern.`,
          `Casual: unlimited games on fresh boards. Counts for points and Undefeated totals, not for the daily boards.`,
          `Easy and Hard: Easy shows ratings and gives re-rolls or re-spins. Hard hides the numbers, makes you type names, and gives none.`,
          `Reel and spin: the wheel that lands on a team (and in some games an era). One spin per slot.`,
          `Re-roll: in 17-0, spending a re-roll to spin a round again and land on a different team.`,
          `Re-spin: in 82-0, 162-0 and 44-0, spending a re-spin on the era or the team. An era re-spin changes the decade, a team re-spin changes the franchise.`,
          `All-time: a 17-0 pool that adds each franchise's greats and legendary coaches to its current roster.`,
          `Right now: a mode that drafts from the current season only.`,
          `Standard: the 82-0 edition that grades today's rosters on NBA 2K ratings instead of historical stats. Classic is the default.`,
          `Legend: a retired player or coach on an All-time board.`,
        ],
      },
      {
        h2: 'Grades and winning',
        paragraphs: [
          `Terms for how a roster becomes a record.`,
        ],
        list: [
          `Overall: the rating EA Sports gives a football player. Shown on the Easy board. The game does not grade on it directly.`,
          `Grade: the number a pick earns from his attributes or stats, from 0 to 99. The season is graded on it.`,
          `Slot: a spot on the roster, such as quarterback or point guard.`,
          `Weight: how much a slot counts toward team strength. Weights in a format add to 100 percent.`,
          `Team strength: the weighted average of the grades. It decides the record.`,
          `Fit: the share of a player's value he keeps when he plays a slot that is not his own. 100, 94, 82 or 70 percent in basketball.`,
          `Playmaker rule: a basketball season with enough assists (seven in the NBA, five in the WNBA) plays the point at no cost.`,
          `Win line: the strength that projects to zero wins. A span above it spreads wins up to a perfect season.`,
          `Perfect line: the strength at which a perfect season is locked in, shown on your result when you fall short.`,
          `Luck roll: a small seeded random number added to the projection. It only helps a team that is below the perfect line.`,
          `Seed: the string that fixes a game's teams, re-rolls and luck. Same seed, same game.`,
        ],
      },
      {
        h2: 'Fantasy football terms',
        paragraphs: [
          `Terms used on the fantasy hub.`,
        ],
        list: [
          `PPR: points per reception. Half PPR gives half a point.`,
          `Replacement level: the points per game of the last player a team would start at a position, or a free pickup.`,
          `VOR: value over replacement, a player's points per game minus replacement level.`,
          `Tier: a group of players close in value, with a clear drop to the next group.`,
          `Snake draft: a draft where the order reverses every round.`,
          `FAAB: free agent acquisition budget, a way to bid for waiver pickups.`,
          `Superflex: a lineup spot that can start a second quarterback.`,
          `Waiver wire: the pool of players not on any roster in a league.`,
        ],
      },
      {
        h2: 'Baseball and basketball terms',
        paragraphs: [
          `Terms from the numbers.`,
        ],
        list: [
          `OPS: on-base percentage plus slugging percentage, a single number for a hitter.`,
          `ERA: earned runs allowed per nine innings.`,
          `PA: plate appearances.`,
          `League norm: the league average for a season, used to grade players against their own era.`,
          `Stocks: steals plus blocks.`,
          `Soft top: the bend that keeps only the greatest seasons near 99.`,
        ],
      },
      {
        h2: 'Site terms',
        paragraphs: [
          `Terms from leaderboards, points and accounts.`,
        ],
        list: [
          `Undefeated board: the leaderboard view that ranks players by perfect seasons in a draft game. Casual perfect seasons count up to five a day.`,
          `Challenge: a link that gives a friend the exact same spins as one of your Casual games.`,
          `Streak: days in a row with at least one finished ranked game.`,
          `Daily Double: the weekday when ranked games pay double points.`,
          `Flagged result: a result the site has marked as suspicious. It is left out of boards and totals.`,
          `Ledger: the list of every point you have earned or spent, each with a reason and a reference.`,
          `Equip: choose which owned item of each kind is shown on your name.`,
          `Drop: a free shop item you can claim for a short window.`,
        ],
      },
      {
        h2: 'Puzzle terms',
        paragraphs: [
          `Terms from the daily puzzles.`,
        ],
        list: [
          `One away: the message when three of the four tiles in a guess belong to one group.`,
          `Spangram: the word in Strands that names the theme and spans the board from one edge to the other.`,
          `Hint: in Strands, a highlight on the letters of one word. It costs rank.`,
          `Check: in the crossword, a count of wrong letters. A check that finds a mistake adds ten seconds.`,
        ],
        closing: [
          `If a word on the site is not here and should be, [tell us](/contact). The [blog index](/blog) has the longer explanations behind most of these.`,
        ],
      },
    ],
  },
];
