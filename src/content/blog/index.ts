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
    excerpt: 'Six teams, six slots, one pick per team. What the reel does, what the grade measures, and why a perfect season is rarer than it looks.',
    sections: [
      {
        h2: 'The short version',
        paragraphs: [
          '17-0 hands you six NFL teams at random. You take exactly one player or coach from each team and slot them into a six-man roster: quarterback, running back, a pass catcher (wide receiver or tight end), a defender, a kicker, and a head coach. When all six slots are filled, the game grades the roster and projects a 17-game record.',
          'That is the whole loop. It takes about two minutes. The part that takes longer is the argument afterward about whether you should have taken the edge rusher instead of the corner.',
        ],
      },
      {
        h2: 'The reel and the respins',
        paragraphs: [
          'The six teams come from a seeded shuffle of all 32 franchises. The seed is fixed when your session starts, so refreshing the page does not reroll the board. The same seed also sits behind two reserve teams, which is where your respins come from. You get two. Spend one on a team whose roster offers nothing for any open slot, and you get the next team in the shuffled order, not a fresh random draw.',
          'The daily puzzle uses the same machinery with a seed built from the date in Eastern Time. Everyone who plays on a given day sees the same six teams in the same order. That is what makes the daily leaderboard a fair fight: same board, different decisions.',
        ],
      },
      {
        h2: 'One pick per team is the real constraint',
        paragraphs: [
          'Most bad rosters are not caused by bad players. They are caused by using a team on the wrong slot. If the only elite quarterback on your board plays for a team that also has the best kicker, you cannot have both. Taking the kicker there means your quarterback comes from somewhere else, and quarterback is a quarter of the grade.',
          'So the first read of any board is not "who is the best player?" It is "which team is the only good source for a slot?" Fill the scarce slots first. Defense is almost never scarce, because five position groups qualify for it. Kicker and quarterback often are.',
        ],
      },
      {
        h2: 'What the grade measures',
        paragraphs: [
          'Every pick gets a grade from 0 to 99. Players are graded on a position formula that weights only the attributes that decide the job, drawn from EA Sports Madden NFL ratings. A quarterback grade is mostly deep and mid accuracy, pressure, and awareness. A corner grade is mostly man and zone coverage plus speed. Overall rating is shown for reference, but the formula grade is what counts. Coaches are graded on the coach impact score.',
          'The six grades are combined into team strength with fixed weights: QB 25 percent, defense 25, running back 15, pass catcher 15, head coach 15, kicker 5. Team strength is then converted to wins with a small, seeded dose of luck. The details are in a separate post on the projected record.',
        ],
      },
      {
        h2: 'Why 17-0 is hard on purpose',
        paragraphs: [
          'A perfect season requires two things at once: team strength of roughly 95.5 or better, and the best possible luck roll. Neither is common. Most competent rosters land between 10 and 13 wins, which is also roughly where good real teams land. The name of the game is the goal, not the expected result.',
          'When you do not get there, the season recap names the slot that got exposed. Usually it is the one you filled last, from the only team left.',
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
          'Every player in the EA Sports Madden NFL ratings has an overall rating and a long list of attribute ratings on a 0 to 99 scale. Overall is the headline number that gets argued about on social media every August. The attributes are the actual inputs: speed, acceleration, catching, man coverage, throw power, deep accuracy, block shedding, and dozens more.',
          'Overall is computed from the attributes with position-specific weights. That makes it useful, but it also means two players with the same overall can be built very differently. A 90 overall corner who wins with press and man coverage is not the same player as a 90 overall corner who wins with zone instincts and range.',
        ],
      },
      {
        h2: 'Why Gridiron Lab grades on attributes',
        paragraphs: [
          'The games on this site do not use overall directly. Each position group has its own short formula of five to seven attributes with published weights, and every player page shows the result as the 17-0 grade. The formulas are deliberately simple so you can check the math yourself. The position pages list every weight.',
          'The reason is transparency, not contrarianism. When a player grades well above or below his overall, you can see exactly which attribute is doing it. If a receiver with a 92 overall grades 86 here, it is almost always because his catching or route running trails his speed, and the formula puts a quarter of the weight on hands.',
        ],
      },
      {
        h2: 'What the ratings are good at',
        paragraphs: [
          'They are consistent. The same scale covers every player in the league, it is updated during the season, and it separates physical traits from skills in a way box score stats cannot. A running back on a bad offensive line will have ugly yards per carry. His vision, burst, and ball security ratings do not care about his line.',
          'They are also detailed at the edges. A kicker with 97 power and 78 accuracy is a very specific player, and that shows up in the grade in a way a field goal percentage over 30 attempts would not.',
        ],
      },
      {
        h2: 'Where they are weakest',
        paragraphs: [
          'Ratings are opinions with a scale attached. They lag real performance, especially for young players who break out midseason, and they carry reputation longer than they should for veterans. Offensive and defensive linemen are the hardest to rate from the outside, which is part of why 17-0 does not include an offensive line slot at all.',
          'Awareness and play recognition are the fuzziest attributes. They try to capture processing speed, which is hard to observe even on film. Our quarterback and defensive formulas lean on them anyway, because leaving them out would be worse.',
        ],
      },
      {
        h2: 'How we source and refresh them',
        paragraphs: [
          'Ratings are pulled on a schedule and stored with the edition they came from. Every player page shows that edition. When a sync goes stale, a banner at the top of the site says so, with the date of the last successful update. We reference the ratings as factual data. Gridiron Lab is an independent fan project and is not affiliated with EA Sports or the NFL.',
          'If you think a rating is wrong, you are probably right about some of them. The games still use them as published, because a shared, fixed scale is what makes the leaderboard fair.',
        ],
      },
    ],
  },
  {
    slug: 'the-math-behind-the-projected-record',
    title: 'The math behind the projected record',
    date: '2026-09-01',
    excerpt: 'Team strength is a weighted average. Wins are strength over 99, times 14, plus a seeded roll from minus 2 to plus 3. Here is what that implies.',
    sections: [
      {
        h2: 'Step one: team strength',
        paragraphs: [
          'Each of your six picks gets a grade from 0 to 99. Team strength is the weighted average of those grades: quarterback 25 percent, defense 25 percent, running back 15, pass catcher 15, head coach 15, kicker 5. The weights add to 100, so strength stays on the same 0 to 99 scale as the grades, and it is rounded to one decimal.',
          'Quarterback and defense together are half the result. A roster with a 95 quarterback and a 94 defender is at 47.3 points of strength before anyone else is picked. A roster with a 78 quarterback and an 80 defender is at 39.5. The remaining four slots can close that gap, but they have to be very good to do it.',
        ],
      },
      {
        h2: 'Step two: strength to wins',
        paragraphs: [
          'Projected wins are round(strength / 99 x 14 + jitter), clamped between 0 and 17. Losses are 17 minus wins. The jitter is a whole number from minus 2 to plus 3, drawn from a deterministic random number generator seeded by your session. The same session always produces the same roll, so you cannot refresh your way to a better record.',
          'Without jitter, a perfect 99 roster projects to exactly 14 wins. That is intentional. Strength alone gets you to a very good season. The last three wins require luck, the same way they do for real teams that go 14-3 and 17-0 with similar rosters.',
        ],
      },
      {
        h2: 'What the numbers imply',
        paragraphs: [
          'Each point of team strength is worth 14/99 of a win, about 0.14. Put the other way, it takes roughly 7 points of strength to add one projected win. Upgrading your running back from a 75 grade to a 90 grade adds 2.25 points of strength, which is about a third of a win on average.',
          'The jitter has six equally likely values, so its average is plus 0.5. A roster with strength 85 expects about 12.5 wins: 12.02 from strength plus half a win of luck on average. The realistic range for that roster is 10 to 15.',
        ],
      },
      {
        h2: 'The threshold for 17-0',
        paragraphs: [
          'To reach 17 wins after rounding, strength / 99 x 14 plus jitter has to be at least 16.5. The maximum jitter is 3, so strength / 99 x 14 must be at least 13.5, which means team strength of at least 95.5. With a jitter of plus 2, even a perfect 99 roster tops out at 16 wins.',
          'So a perfect season needs two things: a roster at 95.5 or above, and the one-in-six top roll. For 16-1, the bar drops to 88.4 with a plus 3 roll, or 95.5 with a plus 2. That is why even very good rosters usually finish 14-3 or 15-2, and why a 17-0 on the daily board gets noticed.',
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
    slug: 'why-your-kicker-matters-more-than-you-think',
    title: 'Why your kicker matters more than you think (5 percent)',
    date: '2026-09-08',
    excerpt: 'Five percent sounds like nothing. At the edge of a perfect season, it is the difference between 16-1 and 17-0.',
    sections: [
      {
        h2: 'The case against caring',
        paragraphs: [
          'The kicker slot is 5 percent of team strength, the smallest weight in 17-0. Quarterback is five times bigger. The obvious play is to fill kicker with whatever is left once the important slots are done, and on most boards that is correct.',
          'Here is the problem: most boards are not the ones you remember. The rosters that get close to a perfect season are the ones where every point of strength matters, and those are exactly the rosters where a lazy kicker pick costs you.',
        ],
      },
      {
        h2: 'Kicker grades have the widest spread',
        paragraphs: [
          'Kickers and punters are graded on two attributes, kick power and kick accuracy, at 50 percent each. There is nothing to average away. A kicker with 95 power and 92 accuracy grades 93.5. A punter pressed into the slot with 90 power and 60 accuracy grades 75.',
          'That 18.5-point gap, multiplied by the 5 percent weight, is about 0.9 points of team strength. For comparison, the gap between a good quarterback grade and a very good one is often 5 or 6 points, which at 25 percent is 1.25 to 1.5 points of strength. The kicker gap is smaller, but it is in the same neighborhood, and it is far cheaper to close.',
        ],
      },
      {
        h2: 'The threshold math',
        paragraphs: [
          'A perfect season requires team strength of at least 95.5 and a plus 3 luck roll. Strength is rounded to one decimal, so a roster at 95.4 with a perfect roll finishes 16-1, and a roster at 95.5 with the same roll finishes 17-0. That is a tenth of a point.',
          'On a roster that is already elite everywhere else, the kicker is the slot most likely to be carrying that tenth. Elite quarterbacks, defenders, and coaches are scarce on any given board. Good kickers usually are not. Picking the 93 kicker instead of the 80 kicker is often the only upgrade still available once the big slots are locked.',
        ],
      },
      {
        h2: 'Opportunity cost is the real lever',
        paragraphs: [
          'The best argument for thinking about the kicker early is the one-pick-per-team rule. Every team you spend on the kicker is a team you cannot use for anything else. If a team offers a great kicker and nothing else you need, it is a free 5 percent: take the kicker there and move on.',
          'The mistake is the reverse. If the only team with an elite kicker also has your best quarterback option, the quarterback wins, obviously. But then look at the other five teams for kicker before any other slot, because the kicker pool on a six-team board is often two or three names deep, and one of them is bad.',
        ],
      },
      {
        h2: 'A simple rule',
        paragraphs: [
          'Before your first pick, find every kicker on the board and note the best one on a team that has nothing else you want. That is your kicker. If no such team exists, fill quarterback and defense first, then take the best kicker left before running back or pass catcher.',
          'Five percent is small. It is also the only slot where good decisions are nearly free.',
        ],
      },
    ],
  },
  {
    slug: 'build-a-player-the-case-for-stealing-one-attribute',
    title: 'Build a Player: the case for stealing one attribute',
    date: '2026-09-15',
    excerpt: 'You do not need the best player on each team. You need the best number in each category. Those are rarely the same thing.',
    sections: [
      {
        h2: 'How the game is built',
        paragraphs: [
          'Build a Player spins five teams. You draft one player at your chosen position from each team, which gives you five sources. Then, category by category, you choose whose number to use. A quarterback build has ten categories, from throw power and three accuracy depths to throwing under pressure, play action, awareness, speed, and agility. One source can supply as many categories as you like.',
          'The finished build is graded on the same position formula the rest of the site uses, and a simulated season turns the attributes into a stat line.',
        ],
      },
      {
        h2: 'The obvious strategy is wrong',
        paragraphs: [
          'The instinct is to draft the highest overall player from each team. That gives you five good players, and five good players will produce a good build. It will rarely produce a great one, because high overall players tend to be good at the same things. Five 85 overall quarterbacks usually share a band of 85 to 90 accuracy and nothing much above it.',
          'What wins is range. You want at least one source who is absurd at something the formula weights heavily, even if he is ordinary everywhere else. His overall does not matter, because you are only going to use one or two of his numbers.',
        ],
      },
      {
        h2: 'Where the weight is',
        paragraphs: [
          'For a quarterback, deep accuracy is 20 percent of the grade on its own. Mid accuracy, throw under pressure, and awareness are 15 each. Speed and play action are 10 each. A backup with 94 deep accuracy and a 70 overall is a better source than a starter with 88 deep accuracy and an 85 overall, as long as you can get the other categories elsewhere.',
          'Other positions work the same way. Receivers are 25 percent catching. Corners are 25 percent man coverage. Edge rushers are 25 percent block shedding. Find the one player on your five teams who owns the top-weighted category, and draft him for that alone.',
        ],
      },
      {
        h2: 'Categories that do not move the grade',
        paragraphs: [
          'Every formula input is a category, but not every category is a formula input. For a quarterback, short accuracy, throw on the run, and agility do not change the grade at all. Agility does feed the simulated rushing total, so it is not useless, but it will not move your letter.',
          'This matters when you are choosing between two sources for your last draft slot. If one is elite in a category the formula ignores, he is a stat-line pick, not a grade pick. Take the other one.',
        ],
      },
      {
        h2: 'A practical draft order',
        paragraphs: [
          'First, look at all five rosters before drafting anyone. For each formula category, note who holds the best number across all five teams. Second, count how many of those category leaders are on the same team. If one team has leaders in three categories, draft that player. Third, for the remaining teams, draft whoever leads the most heavily weighted category still open.',
          'You will often end up drafting a player nobody would start. That is the point. The build does not play the snaps. It just borrows the one thing he does better than anyone else on the board.',
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
          'The head coach slot is 15 percent of team strength in 17-0, the same as running back or pass catcher. Players have attribute ratings. Coaches do not, at least not in a form anyone agrees on. So we built one, kept it simple, and published the formula.',
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
