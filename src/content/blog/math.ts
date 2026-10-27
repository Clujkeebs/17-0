// How the grades and win lines are built, and the arithmetic of perfect seasons. Every number is computed from the live code.
import type { BlogPost } from './types';

export const MATH_POSTS: BlogPost[] = [
  {
    slug: 'how-rare-is-a-perfect-season',
    title: 'How rare is a perfect season? The math across four sports',
    date: '2026-10-27',
    category: 'Sports history',
    excerpt: 'Winning every game is a product of probabilities, not a sum. Here is the arithmetic for football, basketball and baseball, and what the best teams in history tell us.',
    sections: [
      {
        h2: 'A perfect season is a product',
        paragraphs: [
          `If a team wins each game with the same probability p, and the games are independent, the chance of winning all n games is p raised to the power n. That is the whole calculation, and it is brutal. A team that wins 90 percent of its games, which is a dominant team in any sport, has a 17 percent chance of a perfect 17-game season. Stretch the same team over 82 games and the chance is about one in 5,700. Over 162 games it is about one in 26 million.`,
          `The independence assumption is not exactly true. Injuries, rest days and matchups all move the real odds from game to game. But the shape of the answer does not depend on it. Long schedules punish any per-game weakness, because every single game is a chance to ruin the record, and the chances multiply.`,
        ],
      },
      {
        h2: 'The table',
        paragraphs: [
          `This table gives the chance of a perfect regular season for a team that wins each game with the stated probability. The columns are the four schedule lengths used by the games on this site: the NFL's 17, the WNBA's 44, the NBA's 82 and MLB's 162.`,
        ],
        table: {
          caption: 'Chance of winning every game, by per-game win probability and schedule length',
          head: ['Per-game win probability', '17 games (NFL)', '44 games (WNBA)', '82 games (NBA)', '162 games (MLB)'],
          rows: [
            ['70%', '0.23%', '1 in 6.5 million', '1 in 5 trillion', 'effectively never'],
            ['80%', '2.3%', '1 in 18,000', '1 in 88 million', '1 in 5 quadrillion'],
            ['90%', '16.7%', '1.0%', '0.018%', '1 in 26 million'],
            ['95%', '41.8%', '10.5%', '1.5%', '0.025%'],
            ['99%', '84.3%', '64.3%', '43.9%', '19.6%'],
          ],
        },
        closing: [
          `Read across a row to see what the schedule does. At 95 percent per game, which no real team in these leagues has ever sustained, a perfect 17-game season is better than a coin flip to miss, and a perfect 162-game season is a one in 4,000 event.`,
        ],
      },
      {
        h2: 'How good a team has to be',
        paragraphs: [
          `Turn the question around. What per-game win probability makes a perfect season a reasonable bet? For an even chance of going unbeaten, a team needs to win 96 percent of its games over 17, 98.4 percent over 44, 99.2 percent over 82 and 99.6 percent over 162. Those are not rates any team has. They are rates that would make losing a surprise.`,
          `Lower the bar to a one in ten chance and it is still demanding: 87.3 percent per game over 17 games, 94.9 over 44, 97.2 over 82 and 98.6 over 162. The best teams in the history of these sports sit well below the 82 and 162 lines.`,
        ],
      },
      {
        h2: 'What the best teams actually did',
        paragraphs: [
          `The record books give a reality check. The 1995-96 Chicago Bulls went 72-10, a .878 win rate, and won the title. The 2015-16 Golden State Warriors went 73-9, .890, and lost the Finals in seven games. If either team had won every game at its own rate, the chance of 82-0 would have been 1 in 43,000 for the Bulls and 1 in 14,000 for the Warriors. The record 33-game winning streak by the 1971-72 Lakers shows the same thing from the other side: a team can be that good for a third of a season, but not for the whole thing.`,
          `Baseball is harsher. The 1906 Chicago Cubs went 116-36, a .763 win rate that remains the best in the modern era, and the 2001 Seattle Mariners went 116-46, .716. Applied to a 162-game season, those rates give odds of about 1 in 10 quintillion for the Cubs and about 1 in 316 sextillion for the Mariners. A baseball team that wins 70 percent of its games is historically great and still loses nearly one in three.`,
        ],
      },
      {
        h2: 'Football comes closest',
        paragraphs: [
          `The NFL has a short schedule and an enormous gap between its best and worst teams, so perfection has actually happened. The 1972 Miami Dolphins won all 14 regular-season games and all three playoff games, including Super Bowl VII, for a 17-0 finish. The 2007 New England Patriots won all 16 regular-season games, then two playoff games, and lost Super Bowl XLII to the New York Giants, 17-14, so they finished 18-1. The 1934 and 1942 Chicago Bears also went unbeaten in the regular season and lost the championship game.`,
          `As of this writing, no team has finished a 17-game regular season without a loss, and the league has played 17 games a year since 2021. Even at 90 percent per game, a perfect 17 happens one time in six, and no team wins 90 percent of its games every year. That is why 17-0 is the right name for a game about chasing perfection: it is the one perfect season that is actually reachable.`,
        ],
      },
      {
        h2: 'Other leagues have their own near-misses',
        paragraphs: [
          `Shorter schedules make perfection possible in other places. Indiana's men's basketball team finished 32-0 in 1976, the last men's Division I champion to go unbeaten. Connecticut's women's team has finished unbeaten several times, including 39-0 in 2001-02 and 40-0 in 2013-14. In the WNBA, the 2023 Las Vegas Aces went 34-6, at the time the best record in league history, and even that team lost six times in a 40-game season.`,
          `The pattern is consistent. The more games there are, the more a dominant team's record regresses toward the middle, and the harder perfection gets. It is a sports version of the law of large numbers.`,
        ],
      },
      {
        h2: 'What this means for the games here',
        paragraphs: [
          `The draft games do not flip a coin for each game. They take a roster's strength, convert it to an expected number of wins, add a seeded roll of luck, and cap the result. A roster whose expected wins reach the full schedule goes perfect, no matter the roll. A roster just under that line can still get there on a good roll. That is a deliberate choice: the question the games ask is not whether a team got lucky 17 times in a row, but whether you built a roster so far ahead of the field that nothing could beat it.`,
          `That is why the perfect line is a roster strength, not a probability. The [math behind the projected record](/blog/the-math-behind-the-projected-record) shows how strength becomes wins, and [why the win line moves every night](/blog/why-the-win-line-moves-every-night) explains how the site keeps a perfect season rare as players get better at the game.`,
        ],
      },
    ],
  },

  {
    slug: 'how-82-0-rates-a-player-season',
    title: 'How 82-0 rates a player season',
    date: '2026-10-27',
    category: 'The math',
    excerpt: 'One number from 40 to 99 for every player-season, built from the box score. The formula, six worked examples, why the top of the scale is bent and what it cannot see.',
    sections: [
      {
        h2: 'The goal: one number per season',
        paragraphs: [
          `82-0 needs to compare a 1989 center with a 2019 guard on the same scale, using only what ESPN keeps for every player since 1984-85: per-game points, rebounds, assists, steals, blocks, turnovers and shooting percentages. The rating is a box-score composite in the spirit of the game score metrics John Hollinger and others popularized. It does not try to be the best possible measure of basketball. It tries to be consistent, explainable and the same for everyone.`,
          `Every rating is for a single season with a single franchise. When you see a player on a board, you are seeing his best season there in that era, rated from that year's numbers.`,
        ],
      },
      {
        h2: 'The formula',
        paragraphs: [
          `The raw score starts with production: points plus 1.2 times rebounds, plus 1.5 times assists, plus 2.5 times steals, plus 2 times blocks, minus 1.5 times turnovers. When turnovers are missing from the record, the formula assumes 12 percent of points plus assists.`,
          `Three efficiency adjustments follow. Anyone scoring at least 5 points a game gets (field goal percentage minus .460) times 40, so a .560 shooter gains 4 points and a .400 shooter loses 2.4. Scorers at 10 points a game or more also get up to 3.5 points for three-point shooting above .350, at 0.3 points per percentage point, so a .400 shooter gains 1.5. They get between minus 1.5 and plus 2.5 for free throw shooting around .770, at 0.15 points per percentage point. Attempts are not stored, so a low volume of threes never counts against anyone.`,
          `The rating itself is 50 plus 1.02 times the raw score. It is then bent at the top, scaled for sample size, and clamped between 40 and 99.`,
        ],
      },
      {
        h2: 'Why the top of the scale is bent',
        paragraphs: [
          `Without a bend, every great season would pile up at the 99 cap. The best seasons would read the same as merely excellent ones. So values up to 82 pass through unchanged, and above 82 each extra point counts for less, following an exponential curve that creeps toward 99 and never reaches it.`,
          `The effect is easy to see on the first scorer in the table below. Before the bend his number is 96.1. After it, he is a 93.8. A pre-bend 100 becomes 95.2. Only a truly historic stat line gets within a point of 99.`,
        ],
      },
      {
        h2: 'Small samples are pulled to the middle',
        paragraphs: [
          `A player who scores 30 a game over eight games should not top a board. So the rating is blended with a replacement level of 50 in proportion to how many games he played, with 40 games counting as a full sample. A player with 20 games keeps half of his computed value and takes half of 50. This is also why a franchise board requires at least 20 games: it keeps cameos off the list.`,
        ],
      },
      {
        h2: 'Six invented examples, run through the real formula',
        paragraphs: [
          `These lines are made up to show the formula at work. The values are what the live code returns for them.`,
        ],
        table: {
          caption: 'Example stat lines and the value 82-0 gives them',
          head: ['Line', 'Games', 'Value'],
          rows: [
            ['25.0 pts, 8.0 reb, 5.0 ast, 1.0 stl, 1.0 blk, 2.5 tov, .500 FG, .360 3P, .800 FT', '75', '93.8'],
            ['10.0 pts, 4.0 reb, 2.0 ast, 0.8 stl, 0.3 blk, 1.2 tov, .460 FG, .350 3P, .770 FT', '70', '69.0'],
            ['14.0 pts, 12.0 reb, 2.0 ast, 0.7 stl, 2.2 blk, 1.8 tov, .580 FG, .600 FT', '78', '89.4'],
            ['30.0 pts, 7.0 reb, 8.0 ast, 1.5 stl, 0.8 blk, 3.5 tov, .500 FG, .370 3P, .850 FT', '72', '96.5'],
            ['The same 30-point line, in only 28 games', '28', '82.5'],
            ['22.0 pts, 5.0 reb, 7.0 ast, 1.2 stl, 0.3 blk, 4.5 tov, .440 FG, .330 3P, .750 FT', '70', '85.7'],
          ],
        },
        closing: [
          `Three things stand out. The role player at 10 points a game lands at 69, which is why a board's bottom half reads in the 60s and 70s. The big man with 12 rebounds and 2.2 blocks reaches 89 despite a weak free throw line. And the same superstar line drops 14 points when it comes from 28 games instead of 72. Playing time is part of the rating.`,
        ],
      },
      {
        h2: 'From a rating to a lineup',
        paragraphs: [
          `Each pick's rating is multiplied by his fit at the slot you put him in: 100 percent in his own position, 94 one slot away, 82 two away and 70 farther. The five results are averaged into lineup strength, and strength is converted to wins over 82 games from a base line of 70 with a span of 24. The [82-0 strategy guide](/blog/82-0-strategy-eras-positions-and-fit) covers what to do with that.`,
        ],
      },
      {
        h2: 'What the formula cannot see',
        paragraphs: [
          `Defense beyond steals and blocks is invisible, so a lockdown defender who does not accumulate steals rates as a low-usage role player. The efficiency baseline is fixed at .460 rather than adjusted to each season's league average, which slightly favors eras with higher shooting percentages. Pace is not adjusted, so a player on a fast team has more possessions to pile up counting stats. And a box score cannot see screens, spacing or gravity.`,
          `Those limits are real, and they are the reason the rating is described as a composite rather than a verdict. The advantage is that you can check every number yourself. If a rating looks wrong to you, the formula above will tell you exactly why it came out that way.`,
        ],
      },
    ],
  },

  {
    slug: 'how-162-0-grades-hitters-and-pitchers',
    title: 'How 162-0 grades hitters and pitchers',
    date: '2026-10-27',
    category: 'The math',
    excerpt: 'Grades come from real MLB seasons measured against that year\'s league, not video game ratings. The formulas for hitters, starters and relievers, with examples.',
    sections: [
      {
        h2: 'Why not use video game ratings',
        paragraphs: [
          `Baseball video game ratings inflate: a good regular lands in the 80s and the best players sit in the high 90s, and the scale is tied to one year's roster. 162-0 drafts players from every season since 1970, so it needs a measure that works the same for 1971 and 2023. It uses the real stat line from MLB's public Stats API and compares each player with the league he played in.`,
          `That comparison matters more in baseball than anywhere. Run scoring has swung from the pitching-dominated late 1960s to the offense of the late 1990s and back. A .800 OPS means something different in each. Grading against that season's league average keeps the eras honest.`,
        ],
      },
      {
        h2: 'Hitters',
        paragraphs: [
          `A hitter's season needs at least 250 plate appearances to be a draftable line. The raw score is built from four parts. First, how far his OPS is above the league's that year, as a percentage. Second, playing time: one point for every 25 plate appearances above or below 450. Third, speed: one point for every five stolen bases. Fourth, a bonus or penalty for how hard his position is to fill.`,
          `The position adjustments are catcher plus 8, shortstop plus 6, second base and center field plus 4, third base plus 2, right field zero, left field minus 1, first base minus 3 and designated hitter minus 6. The rating is 70 plus 0.6 times the raw score, bent at the top like the basketball rating, and pulled toward 50 for seasons under 400 plate appearances.`,
        ],
      },
      {
        h2: 'Starting pitchers',
        paragraphs: [
          `A starter needs at least 12 starts and 80 innings. His raw score is the percentage by which his ERA beats the league's (capped at 120), plus one point for every six innings above or below 150, plus 20 times the difference between his strikeouts per inning and 0.8. The rating is 70 plus half the raw score, bent at the top and pulled toward 50 for seasons under 140 innings.`,
          `Innings matter. A starter who pitches 220 innings at a good ERA has helped his team more than one who pitches 120 at a great one, and the formula pays for the difference.`,
        ],
      },
      {
        h2: 'Relievers',
        paragraphs: [
          `A reliever needs fewer than six starts, at least 30 appearances and 35 innings. Relief innings are few and ERA swings wildly on them, so the ERA credit is capped and scaled down. The raw score is 80 percent of the ERA edge, plus half a point per save, plus 20 times strikeouts per inning above 0.9, plus one point for every eight innings above or below 60. The rating is 66 plus 0.3 times the raw score, and short seasons are pulled toward 50 hard, with 60 innings counting as a full sample.`,
        ],
      },
      {
        h2: 'Examples, run through the real formulas',
        paragraphs: [
          `These lines are invented. The values are what the live code returns, against a league OPS of .720 and a league ERA of 4.20.`,
        ],
        table: {
          caption: 'Example MLB seasons and the value 162-0 gives them',
          head: ['Line', 'Value'],
          rows: [
            ['Hitter, .900 OPS, 600 PA, 15 SB, at shortstop', '92.7'],
            ['The same hitter at first base', '89.2'],
            ['The same hitter at catcher', '93.3'],
            ['Hitter, .720 OPS (league average), 600 PA, no steals, at shortstop', '77.2'],
            ['Hitter, .800 OPS in only 250 PA, in left field', '63.4'],
            ['Starter, 3.00 ERA, 200 IP, 200 strikeouts', '93.8'],
            ['Starter, 4.20 ERA (league average), 180 IP, 150 strikeouts', '72.8'],
            ['Reliever, 2.20 ERA, 65 IP, 35 saves, 80 strikeouts', '93.4'],
          ],
        },
        closing: [
          `A league-average hitter who plays every day still grades in the high 70s, because playing time and a premium position are worth something. A part-time hitter with a good OPS grades in the low 60s, because a quarter of a season is only a partial sample. And a dominant starter and a dominant closer can grade alike, but the starter counts double in the lineup, which is why he is the most valuable spin on the board.`,
        ],
      },
      {
        h2: 'The league sets the bar',
        paragraphs: [
          `The example that shows why the comparison matters is a pair of invented hitters with the same playing time and the same position. One posts an .850 OPS in a league that averaged .680. The other posts a .900 in a league that averaged .780. The higher OPS is the lesser season by this grade: the first hitter grades 89.7 and the second 83.9, because the first one beat his league by 25 percent and the second by 15.`,
          `The same holds for pitchers. A starter with a 3.20 ERA over 210 innings in a league that averaged 3.60 grades 82.4. A starter with the same innings and strikeouts but a 3.90 ERA in a league that averaged 4.60 grades 85.8. The second ERA looks worse on the page and is the better season. That is the whole point of grading against the league, and it is why a board mixes decades without turning into a contest between the eras.`,
        ],
      },
      {
        h2: 'What it misses',
        paragraphs: [
          `OPS treats a point of on-base percentage and a point of slugging as equal, though on-base is worth a little more in run terms. Defense is only captured through the position bonus, not through any measure of how well a player fields. Park effects and the designated hitter rule are not adjusted. And relief leverage is invisible: a closer in tight games and a long man in blowouts look alike.`,
          `The upside of using public stats and published formulas is that every grade is checkable. For how the grades become a lineup and why starters count double, read the [162-0 guide](/blog/162-0-guide-lineup-rotation-and-eras).`,
        ],
      },
    ],
  },

  {
    slug: 'why-the-win-line-moves-every-night',
    title: 'Why the win line moves a little every night',
    date: '2026-10-27',
    category: 'The math',
    excerpt: 'A nightly job compares real results with a target and nudges each mode\'s win line. What it measures, how far it can move, and why a fixed formula would drift.',
    sections: [
      {
        h2: 'The problem with a fixed formula',
        paragraphs: [
          `Every draft game turns a roster strength into a record with a win line: the strength that projects to zero wins, and a span over which wins climb to a perfect season. In 17-0 the base line is 68.8 with a span of 26. In 82-0 and 162-0 it is 70 with a span of 24, and in 44-0 it is 66 with a span of 24.`,
          `Those numbers were fitted by simulation. We built bots that draft the way a careful person would, played thousands of simulated games, and set the line so a perfect season came out at a few percent. That works on day one. It does not stay true. Ratings change during the season, rosters change, and real players get better at the game than a simple bot. A line fitted once drifts, and a perfect season that was meant to be rare quietly becomes common, or impossible.`,
        ],
      },
      {
        h2: 'What the nightly job looks at',
        paragraphs: [
          `Once a night, in the early morning Eastern time, a job looks at the finished Casual Easy games from the last 30 days in each mode. A mode is only adjusted when there are enough games to say something: at least 20 runs from at least five different players. Each player counts only their latest three runs, so a few people playing hundreds of games cannot set the line for everyone.`,
          `The job does not look at records. It looks at team strengths, which do not depend on what line the games were graded against. Then it asks one question: where would the line have to be for the best tenth of those rosters to finish at the target?`,
        ],
      },
      {
        h2: 'The target',
        paragraphs: [
          `For 82-0, 162-0 and 44-0 the target is that the best tenth of real drafters finish at 94 percent of the season: about 77-5 in 82-0, 152-10 in 162-0 and 41-3 in 44-0. That keeps a perfect season to a few in a hundred. For 17-0 the target is a notch tighter, 91 percent, which is 15-2. The tighter target came after real 6-man games reached a 13.5 percent perfect rate in a few days and friends asked for a harder game.`,
          `Using the best tenth rather than the average is deliberate. The average drafter is not the one chasing a perfect season. The line has to be right for the people who are good at the game, because those are the people who decide whether 17-0 feels rare.`,
        ],
      },
      {
        h2: 'How far it can move',
        paragraphs: [
          `The adjustment is cautious. The job computes a wanted offset and then shrinks it by how much it trusts the sample. That trust is n divided by n plus 40, so 20 runs count for about a third and 250 runs for about nine tenths. It then moves half of the remaining gap, never more than half a point of strength in one night (scaled to each mode's span). And the offset can never sit more than 15 percent of the span away from the fitted line.`,
          `In practice a mode moves by tenths of a point over several nights, in one direction, until it settles. The small step is the point. A line that jumped around would feel unfair, and you would never be able to tell whether you had improved or the game had changed.`,
        ],
      },
      {
        h2: 'A worked example, with invented numbers',
        paragraphs: [
          `Suppose the last 30 days hold 60 runs of the classic six-man game from 12 different players, and the strength of the best tenth of those rosters is 93.7. For the best tenth to finish at 91 percent of 17 games, the win line would need to sit at 93.7 minus 0.91 times 26, which is 70.0. The base line is 68.8, so the wanted offset is plus 1.2.`,
          `Sixty runs earns a trust of 60 divided by 100, or 0.6, so the job aims for plus 0.7 rather than plus 1.2. It moves about half of the distance from where the offset sits today, so on the first night it adds a little under 0.4. The next night it measures again, with new games and the new line, and repeats. If the target is reached, the offset stops moving. If the games get easier or harder, it follows.`,
          `This is not hypothetical. On the first night after the 17-0 target was tightened to 15-2, the classic six-man line moved by half a point, the most the rules allow in one night.`,
        ],
      },
      {
        h2: 'What you will notice as a player',
        paragraphs: [
          `Almost nothing, and that is the aim. The thresholds quoted in blog posts, such as 91.0 for a perfect 17-0 with a good roll, are for the base line. The live line is a few tenths from it. The result page tells you where a perfect season locks in for that game, which is the number to trust.`,
          `Modes without enough games yet, such as the less-played roster sizes and All-time variants, stay on the fitted line until the data arrives. If a mode feels too easy or too hard to you, play it more and tell your friends to: the line follows the players.`,
        ],
      },
      {
        h2: 'Why it is worth doing',
        paragraphs: [
          `The point of a perfect-season game is that a perfect season should be hard but possible. Too easy and the leaderboard is full of 17-0 results that mean nothing. Too hard and nobody tries. A job that keeps the best players near 15-2 gives a perfect season the right amount of scarcity, and it does so without any person tuning a number by hand.`,
          `The [Undefeated leaderboards](/leaderboard) count perfect seasons per game, with Casual perfect seasons capped at five a day so the count cannot be farmed. The cap and the nightly line work together: one keeps the count honest, the other keeps the achievement meaningful.`,
        ],
      },
    ],
  },
];
