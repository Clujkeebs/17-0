// Blog posts as data. Rendered by src/app/(site)/blog. Keep copy free of em-dashes and en-dashes.

export interface BlogSection { h2: string; paragraphs: string[] }
export interface BlogPost {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  excerpt: string;
  sections: BlogSection[];
}

const POSTS: BlogPost[] = [
  {
    slug: 'how-17-0-works',
    title: 'How 17-0 works',
    date: '2026-08-18',
    excerpt: 'One reel, six spins, six slots, one pick per team. What the reel does, what the grade measures, and why a perfect season is rarer than it looks.',
    sections: [
      {
        h2: 'The short version',
        paragraphs: [
          '17-0 has one reel. It spins, lands on a single NFL team, and you draft one player or coach from that team into an open slot. Then it spins again. Six spins fill a six-man roster: quarterback, running back, wide receiver, tight end, one defender from any defensive position, and a head coach. When the last slot is filled, the game grades the roster and projects a 17-game record.',
          'That is the whole loop. It takes about two minutes. The part that takes longer is the argument afterward about whether you should have taken the edge rusher instead of the tight end.',
        ],
      },
      {
        h2: 'The reel',
        paragraphs: [
          'The six teams come from a seeded shuffle of all 32 franchises. The seed is fixed when your session starts, so refreshing the page does not reroll the board. There are no re-spins. Whatever team the reel lands on, you draft from it.',
          'The daily puzzle uses the same machinery with a seed built from the date in Eastern Time. Everyone who plays on a given day sees the same six teams in the same order. That is what makes the daily leaderboard a fair fight: same board, different decisions.',
        ],
      },
      {
        h2: 'You only see one team at a time',
        paragraphs: [
          'This is the real constraint. You do not get to look at all six teams and plan. You see one team, you commit, and the slot is gone. If the reel opens on a team with an elite tight end and an average quarterback, taking the tight end is safe but spends a spin on the 8 percent slot. Taking the quarterback bets that no better one is coming.',
          'So every pick is a guess about what the rest of the reel will bring. Defense is the easiest slot to fill late, because five position groups qualify for it and almost every team has a good defender. Quarterback is the hardest, because many teams do not have a good one. When the reel hands you a great quarterback, take him.',
        ],
      },
      {
        h2: 'What the grade measures',
        paragraphs: [
          'Every pick gets a grade from 0 to 99. Players are graded on a position formula that weights only the attributes that decide the job, drawn from EA Sports Madden NFL 27 ratings. A quarterback grade is mostly accuracy, pressure, and awareness. A corner grade is mostly man and zone coverage plus speed. Overall rating is shown for reference, but the formula grade is what counts. Coaches are graded on the coach impact score.',
          'The six grades are combined into team strength with fixed weights: QB 30 percent, wide receiver 22, running back 18, defense 13, head coach 9, tight end 8. The order follows how much each spot moves a real offense, so a 97 receiver with a 90 tight end beats the reverse. Team strength is then converted to wins with a small, seeded dose of luck. The details are in a separate post on the projected record.',
        ],
      },
      {
        h2: 'Why 17-0 is hard on purpose',
        paragraphs: [
          'A perfect season requires team strength of roughly 91 or better and a good luck roll, or about 95.6 and any roll at all. A well-drafted roster goes 17-0 roughly one time in eight. Most competent rosters land between 10 and 14 wins, which is also roughly where good real teams land. The name of the game is the goal, not the expected result.',
          'When you do not get there, the season recap names the slot that got exposed. Usually it is the one you filled last, from whatever team the reel had left.',
        ],
      },
    ],
  },
  {
    slug: 'ea-sports-madden-nfl-ratings-explained',
    title: 'EA Sports Madden NFL ratings, explained',
    date: '2026-08-25',
    excerpt: 'Overall is a summary, not a scouting report. What the attribute ratings are, how we use them, and where they are weakest.',
    sections: [
      {
        h2: 'Two layers of numbers',
        paragraphs: [
          'Every player in the EA Sports Madden NFL 27 ratings has an overall rating and a long list of attribute ratings on a 0 to 99 scale. Overall is the headline number that gets argued about on social media every August. The attributes are the actual inputs: speed, acceleration, catching, man coverage, throw power, deep accuracy, block shedding, and dozens more.',
          'Overall is computed from the attributes with position-specific weights. That makes it useful, but it also means two players with the same overall can be built very differently. A 90 overall corner who wins with press and man coverage is not the same player as a 90 overall corner who wins with zone instincts and range.',
        ],
      },
      {
        h2: 'Why Unbeaten grades on attributes',
        paragraphs: [
          'The games on this site do not use overall directly. In 17-0, each position group has its own short formula of five to seven attributes with published weights, and every player page shows the result as the 17-0 grade. In Build a Player, each position has five traits, each built from one or two attributes. The formulas are deliberately simple so you can check the math yourself. The position pages list every weight.',
          'The reason is transparency, not contrarianism. When a player grades well above or below his overall, you can see exactly which attribute is doing it. If a receiver with a 92 overall grades 86 here, it is almost always because his catching or route running trails his speed, and the formula puts a quarter of the weight on hands.',
        ],
      },
      {
        h2: 'What the ratings are good at',
        paragraphs: [
          'They are consistent. The same scale covers every player in the league, it is updated during the season, and it separates physical traits from skills in a way box score stats cannot. A running back on a bad offensive line will have ugly yards per carry. His vision, burst, and ball security ratings do not care about his line.',
          'They are also detailed at the edges. A tight end with 88 run blocking and 70 catching is a very specific player, and that shows up in the grade in a way a season of receiving yards would not.',
        ],
      },
      {
        h2: 'Where they are weakest',
        paragraphs: [
          'Ratings are opinions with a scale attached. They lag real performance, especially for young players who break out midseason, and they carry reputation longer than they should for veterans. Offensive and defensive linemen are the hardest to rate from the outside, which is part of why the classic six-man 17-0 roster has no offensive line slot. The 12 and 16 man rosters add one, graded on blocking alone.',
          'Awareness and play recognition are the fuzziest attributes. They try to capture processing speed, which is hard to observe even on film. Our quarterback and defensive formulas lean on them anyway, because leaving them out would be worse.',
        ],
      },
      {
        h2: 'How we source and refresh them',
        paragraphs: [
          'Ratings are updated weekly and stored with the edition they came from. Rosters and head coaches are kept current from ESPN team rosters, so a traded player moves teams on the reel once the roster updates. Every player page shows the ratings edition. When a sync goes stale, a banner at the top of the site says so, with the date of the last successful update. We reference the ratings as factual data. Unbeaten is an independent fan project and is not affiliated with EA Sports, ESPN, or the NFL.',
          'If you think a rating is wrong, you are probably right about some of them. The games still use them as published, because a shared, fixed scale is what makes the leaderboard fair.',
        ],
      },
    ],
  },
  {
    slug: 'the-math-behind-the-projected-record',
    title: 'The math behind the projected record',
    date: '2026-09-01',
    excerpt: 'Team strength is a weighted average. Wins are strength minus 68.8, over 26, times 17, plus a seeded roll from minus 2 to plus 1. Here is what that implies.',
    sections: [
      {
        h2: 'Step one: team strength',
        paragraphs: [
          'Each of your six picks gets a grade from 0 to 99. Team strength is the weighted average of those grades: quarterback 30 percent, wide receiver 22, running back 18, defense 13, head coach 9, tight end 8. The weights add to 100, so strength stays on the same 0 to 99 scale as the grades, and it is rounded to one decimal.',
          'Quarterback and wide receiver together are 52 percent of the result. A roster with a 95 quarterback and a 94 receiver is at 49.2 points of strength before anyone else is picked. A roster with a 78 quarterback and an 80 receiver is at 41.0. The remaining four slots can close that gap, but they have to be very good to do it.',
        ],
      },
      {
        h2: 'Step two: strength to wins',
        paragraphs: [
          'Projected wins are round((strength minus 68.8) / 26 x 17 + jitter), clamped between 0 and 17. Losses are 17 minus wins. The jitter is a whole number from minus 2 to plus 1, drawn from a deterministic random number generator seeded by your session. The same session always produces the same roll, so you cannot refresh your way to a better record.',
          'The 68.8 is a floor. A roster at 68.8 strength projects to zero wins before luck, which is harsh on purpose: a lineup of replacement-level players should look like a replacement-level team. Everything above 68.8 is spread across 26 points of strength and 17 games.',
        ],
      },
      {
        h2: 'What the numbers imply',
        paragraphs: [
          'Each point of team strength is worth 17/26 of a win, about 0.65. Put the other way, it takes about 1.5 points of strength to add one projected win. Upgrading your running back from a 75 grade to a 90 grade adds 2.7 points of strength, which is about 1.8 wins. Small upgrades matter far more here than they would on a flatter curve.',
          'The jitter has four equally likely values, so its average is minus 0.5. Luck tends to cost you a little rather than help. A roster with strength 85 expects about 11 wins: 11.6 from strength minus half a win of luck on average. The realistic range for that roster is 10 to 13.',
        ],
      },
      {
        h2: 'The threshold for 17-0',
        paragraphs: [
          'To reach 17 wins after rounding, the formula has to produce at least 16.5. With the best roll of plus 1, team strength of 91.0 gets there. With a roll of 0, you need 92.5. With minus 1, 94.1. At 95.6 or above, even the worst roll of minus 2 still rounds to 17.',
          'So a perfect season is within reach of any roster that grades around 91, with a one-in-four roll, and guaranteed only for rosters above 95.5. In practice a well-drafted roster goes 17-0 roughly one time in eight. For 16-1 with the best roll, the bar drops to 89.5.',
        ],
      },
      {
        h2: 'Why seeded luck and not pure randomness',
        paragraphs: [
          'Deterministic luck means results are reproducible. Your result page can be shared and reloaded and it will always say the same thing. It also means there is no rerolling a bad draw: grading the same session twice gives the same answer.',
          'The score on the leaderboard is wins times 1,000 plus team strength times 10. Wins decide the ranking, and strength breaks ties. Two 15-2 rosters are ordered by who built the better team, not who got the better roll.',
        ],
      },
    ],
  },
  {
    slug: 'the-tight-end-slot',
    title: 'The tight end slot (8 percent)',
    date: '2026-09-08',
    excerpt: 'The smallest weight in 17-0 is also the one most likely to decide whether a good roster finishes 16-1 or 17-0.',
    sections: [
      {
        h2: 'The case against caring',
        paragraphs: [
          'The tight end slot is 8 percent of team strength, the smallest weight in 17-0. Quarterback is almost four times bigger, and a wide receiver counts nearly three times as much. The obvious play is to leave tight end for last and take whatever the final spin gives you, and on plenty of boards that works out.',
          'The problem is that the reel only shows you one team at a time. If you leave tight end for last, the last team decides it for you, and some teams do not have a tight end worth a roster spot. The rosters that get close to a perfect season are the ones where every point of strength matters, and those are exactly the rosters where a forced tight end pick costs you.',
        ],
      },
      {
        h2: 'Tight end grades have a wide spread',
        paragraphs: [
          'Tight ends are graded on six attributes: catching and run blocking at 20 percent each, then catch in traffic, speed, route running, and awareness at 15 each. That formula rewards a complete player. A tight end who only catches or only blocks gives away a third of the grade.',
          'The result is a wide range. A true two-way starter grades in the high 80s. A blocking specialist or a big receiver with no interest in the run game often lands around 70. That 18-point gap, at 8 percent, is 1.4 points of team strength. At 0.65 wins per point, it is worth almost a full projected win.',
        ],
      },
      {
        h2: 'The threshold math',
        paragraphs: [
          'A perfect season needs team strength of at least 91.0 with the best luck roll, or 95.6 to be safe with any roll. Strength is rounded to one decimal, so a roster at 90.9 with a plus 1 roll finishes 16-1, and a roster at 91.0 with the same roll finishes 17-0. That is a tenth of a point.',
          'On a roster that is already strong at quarterback, receiver, and running back, the tight end is the slot most likely to be carrying that tenth. It is also the slot most people fill without thinking, which is why it so often shows up in the season recap as the unit that got exposed.',
        ],
      },
      {
        h2: 'When to take the tight end early',
        paragraphs: [
          'The reel spins one team at a time, so every pick has an opportunity cost you cannot see yet. The question is not whether the tight end is the best player on this team. It is whether this team is likely to be your best source for tight end among the teams still to come.',
          'Elite tight ends are rare. On most days, only a handful of the 32 teams have one who grades in the high 80s. If the reel lands on one of those teams and it has no quarterback you want, take the tight end. Wide receivers, running backs, and defenders are spread much more evenly across the league, so passing on them is cheaper.',
        ],
      },
      {
        h2: 'When to wait',
        paragraphs: [
          'If the same team offers a quarterback who grades in the 90s, the quarterback wins. Thirty percent beats eight, and a great quarterback is even harder to find than a great tight end. The same goes for a top receiver or running back.',
          'A simple rule: fill quarterback when you see a good one, fill tight end when you see an elite one, and let defense come last, since almost any team can fill it. Eight percent is small. It is also the slot where one early decision is most likely to be the difference between very good and perfect.',
        ],
      },
    ],
  },
  {
    slug: 'build-a-player-the-case-for-stealing-one-attribute',
    title: 'Build a Player: the case for stealing one trait',
    date: '2026-09-15',
    excerpt: 'You do not need the best player on each team. You need the best number for each trait, placed in the right order. Those are rarely the same thing.',
    sections: [
      {
        h2: 'How the game is built',
        paragraphs: [
          'Build a Player starts with a position. A position of the day is preselected and rotates daily, but you can pick any of them. Each position has five traits with fixed weights. A quarterback has arm at 20 percent, accuracy at 25, mobility at 15, deep ball at 15, and poise at 25.',
          'The reel spins five times, one team per spin, and no team repeats. Each player on that team shows his rating for every trait you still need to fill, for example "Fills your deep ball at 96". You tap one trait to take from one player, and the reel spins again. The fifth placement builds the player.',
          'The result is a weighted score, a letter grade, the best possible score from those same five teams, and a simulated season.',
        ],
      },
      {
        h2: 'The obvious strategy is wrong',
        paragraphs: [
          'The instinct is to take the best player on each team and use him for his best trait. That produces a good build. It rarely produces a great one, because the best player on a team is often good at everything and elite at nothing, and a trait you place early is a trait you cannot upgrade later.',
          'What wins is range. You want the one player on the reel who is absurd at a heavily weighted trait, even if he is ordinary everywhere else. His overall does not matter, because you are only taking one number from him.',
        ],
      },
      {
        h2: 'Where the weight is',
        paragraphs: [
          'For a quarterback, accuracy and poise are 25 percent each, half the score between them. Arm is 20. Mobility and deep ball are 15 each. A 96 in poise is worth more than a 96 in deep ball, so if a team offers both, poise is usually the right place for it.',
          'Other positions work the same way. Receivers put 25 percent on route running. Corners put 30 percent on man coverage. Edge rushers split half the score between power rush and finesse rush. The position pages list every trait and weight.',
        ],
      },
      {
        h2: 'Placing a trait is a bet on the next spin',
        paragraphs: [
          'You only see one team at a time, so every placement is a guess about what the remaining spins will bring. If this team offers a 94 in a 25 percent trait, that is almost always worth taking. If it offers an 88 in a 25 percent trait and a 95 in a 15 percent trait, the math is closer than it looks, and the answer depends on how many spins are left.',
          'Late in the build, the calculation flips. On the fifth spin you have one open trait, and you take the best number on the team for it, whatever it is. That is why the heavy traits are worth locking early: the last spin is the one you do not control.',
        ],
      },
      {
        h2: 'The best possible score',
        paragraphs: [
          'After the build, the result shows the best score those five teams could have produced if every trait had been placed perfectly. The gap between your score and that number is the only fair measure of the build. A 78 on a weak set of teams can be a better build than an 86 on a strong one.',
          'You will often end up taking a trait from a player nobody would start. That is the point. The build does not play the snaps. It borrows the one thing he does better than anyone else on the reel.',
        ],
      },
    ],
  },
  {
    slug: 'coach-impact-score-explained',
    title: 'Coach impact score, explained',
    date: '2026-09-22',
    excerpt: 'A single number for a head coach, built from roster quality, recent winning, playoff trips, rings, and tenure. The formula, the tradeoffs, and what it misses.',
    sections: [
      {
        h2: 'Why coaches need a number',
        paragraphs: [
          'The head coach slot is 9 percent of team strength in 17-0. A coach matters, just less than the quarterback the offense runs through. Players have attribute ratings. Coaches do not, at least not in a form anyone agrees on. So we built one, kept it simple, and published the formula.',
          'The coach impact score runs from 0 to 99, like a player grade, and it plugs straight into team strength. There is no separate coach formula inside the game. The score is the grade.',
        ],
      },
      {
        h2: 'The formula',
        paragraphs: [
          'Impact = roster average overall x 0.35 + win percentage over the last three seasons x 35 + playoff appearances in the last three seasons x 3 + Super Bowl wins x 6 + years with the team x 0.5. The result is rounded and capped between 0 and 99.',
          'A worked example: a coach whose roster averages 75 overall contributes 26.25 points from the roster. A .650 win percentage over three seasons adds 22.75. Two playoff trips add 6. One title adds 6. Eight years with the team add 4. The total is 65.',
        ],
      },
      {
        h2: 'What each term is doing',
        paragraphs: [
          'The roster term is the biggest single input, and that is on purpose. A coach who has built or kept a deep roster deserves some of the credit, and roster average is a stable number that does not swing with one bad season. It also keeps the score grounded: a coach cannot post an elite number with a thin team just by winning close games for a year.',
          'Recent winning is the second pillar. Three seasons is long enough to smooth out injuries and schedule luck, short enough that a coach does not coast on a decade-old run. Playoff trips reward sustained competence. Super Bowl wins are worth 6 points each, a real bump but not enough to carry a coach whose recent teams have slipped. Tenure is a small nudge for stability.',
        ],
      },
      {
        h2: 'Why coach scores run lower than player grades',
        paragraphs: [
          'Look at the example again. A good coach with a title lands in the mid 60s. Getting into the 80s requires an elite roster, a win rate near .750, three straight playoff trips, and multiple rings. That compression is a feature. In 17-0, an 80 coach is genuinely rare, and a 70 coach is a solid pick.',
          'It also changes strategy. Because the coach pool is compressed, the gap between the best and worst coach on a board is usually smaller than the gap between the best and worst running back. When a board forces a tradeoff between a great coach and a great running back from the same team, the running back is often the better use of that team.',
        ],
      },
      {
        h2: 'What it misses',
        paragraphs: [
          'Scheme, play calling, game management, player development, and culture are not in the formula, because none of them can be measured cleanly from public data. The score is an outcome measure, not a talent evaluation. A brilliant first-year coach with an inherited roster will score lower than he deserves until the results catch up.',
          'Scores are recomputed on a schedule and the site keeps a history of each one, so a coach climbs or slides as seasons enter and leave the three-year window. Each coach page shows the calculation term by term.',
        ],
      },
    ],
  },
];

export const BLOG_POSTS: BlogPost[] = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug) ?? null;
export const wordCount = (p: BlogPost) => p.sections.reduce((n, s) => n + s.h2.split(/\s+/).length + s.paragraphs.join(' ').split(/\s+/).length, 0);
export const readingMinutes = (p: BlogPost) => Math.max(1, Math.round(wordCount(p) / 230));
