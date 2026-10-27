// Strategy guides for the four draft games. Every number here comes from the live rules; change it when the rule changes.
import type { BlogPost } from './types';

export const STRATEGY_POSTS: BlogPost[] = [
  {
    slug: 'how-to-draft-a-17-0-roster',
    title: 'How to draft a 17-0 roster, slot by slot',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'What each slot is worth in projected wins, why quarterback comes first, where the easy picks hide, and a spin-by-spin plan for the six-man game.',
    sections: [
      {
        h2: 'Start with what a slot is worth',
        paragraphs: [
          `Every pick in 17-0 gets a grade from 0 to 99, and the six grades are averaged with fixed weights into team strength. The weights are most of the strategy in one line. Quarterback is 30 percent, wide receiver 22, running back 18, defense 13, head coach 9 and tight end 8. They add to 100, so a grade point at quarterback moves team strength by 0.30 and a grade point at tight end moves it by 0.08.`,
          `The useful way to read that is in wins. The season spreads 17 games over a 26-point span of strength, so a point of team strength is worth about 0.65 of a projected win. Here is what a ten-point upgrade at each slot is worth, which is roughly the gap between a good pick and a great one.`,
        ],
        table: {
          caption: 'Value of a ten-point grade upgrade at each slot in the six-man game',
          head: ['Slot', 'Weight', 'Strength gained', 'Wins gained'],
          rows: [
            ['Quarterback', '30%', '3.0', '1.96'],
            ['Wide receiver', '22%', '2.2', '1.44'],
            ['Running back', '18%', '1.8', '1.18'],
            ['Defense', '13%', '1.3', '0.85'],
            ['Head coach', '9%', '0.9', '0.59'],
            ['Tight end', '8%', '0.8', '0.52'],
          ],
        },
        closing: [
          `Quarterback is worth almost four tight ends. A 94-grade quarterback instead of an 84 is two projected wins, the difference between a good season and a great one. The same ten points at tight end is half a win. Keep that table in your head and most of the decisions get easier.`,
        ],
      },
      {
        h2: 'Quarterback first, almost always',
        paragraphs: [
          `Thirty percent is the largest weight by a wide margin, and quarterback is also the thinnest supply. Plenty of teams have a good receiver or a good defender. Far fewer have a quarterback rated in the 90s. When the reel lands on one, take him unless the same team offers something rarer.`,
          `The exception is arithmetic, not instinct. Suppose a team offers a 90 quarterback and a 97 receiver, and you expect to fill each slot at about 85 otherwise. The quarterback is a five-point gain at 0.30, which is 1.5 points of strength. The receiver is a twelve-point gain at 0.22, which is 2.6. The receiver is the better pick even though quarterback carries the bigger weight. Always price a pick against what you expect to find later, not against zero.`,
        ],
      },
      {
        h2: 'Receiver and running back: the deep middle of the board',
        paragraphs: [
          `Receiver at 22 percent and running back at 18 percent are where most of the decisions happen, because nearly every team has a starter at both. The grades come from attributes. A receiver is catching 25 percent, route running 20, speed 20, release 15, catching in traffic 10 and awareness 10. A running back is carrying 20, vision 20, speed 20, acceleration 15, break tackle 15 and juke moves 10.`,
          `Because the supply is deep, treat these as slots to fill with a clear upgrade rather than a default. A 92 receiver is worth taking early. An 84 receiver is a pick you can usually match later, which makes him a reason to wait or spend a re-roll, not a reason to commit. The board shows overall ratings, and the season is graded on the formula, so two receivers with the same overall can grade a few points apart. When two players are close, prefer the one whose strengths are the ones the formula pays for: catching and route running at receiver, vision and carrying at running back.`,
        ],
      },
      {
        h2: 'Defense is the easy slot',
        paragraphs: [
          `The defense slot takes any defender: defensive line, edge rusher, linebacker, cornerback or safety. Five position groups qualify, so almost every team can supply someone in the high 80s. That makes defense the slot to leave for last, when the earlier spins have already told you what you still need.`,
          `Do not treat it as free, though. Thirteen percent is real: the ten points that cost half a win at tight end cost 0.85 here. Defenders are graded by their own position formula, so a label is not enough. An edge rusher is graded mostly on block shedding, power moves and finesse moves. A cornerback is graded mostly on man coverage, zone coverage and speed. Between two defenders with close overalls, take the one whose game matches what his position formula pays for.`,
        ],
      },
      {
        h2: 'Head coach and tight end: judge them against their own pool',
        paragraphs: [
          `The two small slots, 9 and 8 percent, each have a quirk. Current head coaches are graded by rank, spread evenly from 80 to 97, so the best and worst coach on any board are at most 17 points apart. That whole spread is worth about one projected win. The [coach impact score](/blog/coach-impact-score-explained) post explains how the ranking works. Read an 86 coach as an average coach, not a bad one.`,
          `Tight ends have the opposite shape: a wide spread, from the high 80s for a true two-way starter to around 70 for a specialist, and only a handful of elite ones on any given board. The [tight end post](/blog/the-tight-end-slot) covers when to take one early. The short version is that an elite tight end is worth a spin and an average one is not.`,
        ],
      },
      {
        h2: 'A plan for six spins',
        paragraphs: [
          `Rules of thumb beat a rigid script, because the reel decides what you see. These have held up well.`,
        ],
        list: [
          `Take any quarterback rated in the 90s on the first or second spin, unless the same team offers a receiver or back 10 or more points better than you expect to find.`,
          `Take a receiver or running back in the low 90s or better the moment you see one, and let ordinary ones pass while you still have spins to spare.`,
          `Leave defense, tight end and head coach for the later spins unless one of them is elite. They are the slots a late spin is most likely to fill acceptably.`,
          `On the last two spins you are filling whatever is open, so the team in front of you matters less than the rating of the best player it has at that slot. Use a re-roll if that rating is far below what the slot usually offers.`,
          `Look at what is left before you pick. If only defense and tight end are open, a team with a mediocre defender and an elite tight end is a good spin.`,
        ],
        closing: [
          `The [guide to re-rolls](/blog/when-to-use-your-re-rolls-in-17-0) covers when to spend yours. If you play Hard mode, where ratings are hidden, read the [Hard mode guide](/blog/hard-mode-17-0-drafting-from-memory) as well. And after every game, read the recap: it names the slot that cost you the most, which is the quickest way to learn this game.`,
        ],
      },
    ],
  },

  {
    slug: 'when-to-use-your-re-rolls-in-17-0',
    title: 'When to use your re-rolls in 17-0',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'Two re-rolls, six spins and a simple way to decide: compare the pick you have with the odds of a better one later.',
    sections: [
      {
        h2: 'What a re-roll actually does',
        paragraphs: [
          `Easy mode gives you two re-rolls in the six-man game, and five in the full 53-man game. Spend one and that round spins again, landing on a different team. The team you threw back is gone. Hard mode gives none.`,
          `That makes a re-roll a trade of a known team for an unknown one. The known team has a best pick for the open slot you can read off the board. The unknown team is a draw from the teams you have not been shown. The whole question is whether that draw beats what you have.`,
        ],
      },
      {
        h2: 'The odds of seeing what you need',
        paragraphs: [
          `Suppose you need a quarterback you would be happy with, and k of the 32 teams can supply one. You have seen two teams and neither qualified, so 30 are unseen. If the order of the remaining teams is random, the chance that at least one of the next few spins is a team you want is a simple counting problem. This table assumes four, eight and twelve good teams and one to four spins still to come.`,
        ],
        table: {
          caption: 'Chance that at least one of the next spins is a team you want, with 30 teams unseen',
          head: ['Good teams out of 30', '1 spin', '2 spins', '3 spins', '4 spins'],
          rows: [
            ['4 (a scarce slot)', '13%', '25%', '36%', '45%'],
            ['8', '27%', '47%', '62%', '73%'],
            ['12 (a common slot)', '40%', '65%', '80%', '89%'],
          ],
        },
        closing: [
          `Read the first column as the odds a single re-roll lands on a team you want. For a scarce slot like a 90-plus quarterback, that is closer to one in eight than one in two. The numbers are illustrations of how the counting works, not measurements of today's board. The point is the shape: a re-roll is a poor bet for a scarce slot and a decent one for a common slot.`,
        ],
      },
      {
        h2: 'A rule that follows from the table',
        paragraphs: [
          `Re-roll when the best pick the current team offers for any open slot is clearly worse than the pick you would expect from a random team. Do not re-roll just because the team is not exciting. A team with a 91 receiver and an ordinary everything-else gives you a certain 91 at a 22 percent slot. A re-roll gives you a chance at something better and a real chance at something worse.`,
          `The strongest reason to re-roll is a team that offers nothing for any slot you still need. If four slots are open and this team has no quarterback you want, no receiver above your floor and a weak defender, you are about to spend a spin on a pick that barely moves team strength. That is when a re-roll is cheap, because you are not giving anything up.`,
        ],
      },
      {
        h2: 'Why late re-rolls are worth more',
        paragraphs: [
          `Early in the game you have many spins left to fill each slot, so a bad team costs you little: another is coming. Late in the game you have one open slot and one spin. If the team in front of you has no one good for that slot, nothing else will rescue you. A re-roll on the last spin is a single draw, and a single draw at a common slot is a 40 percent shot at something good in the table above.`,
          `So hold your re-rolls longer than feels natural. A re-roll spent on spin two to avoid a so-so team is a re-roll you do not have on spin six, when the open slot is quarterback and the team is the Jaguars. The exception is a slot that is scarce and heavy. If the quarterback slot is still open on spin four and the team has none, re-roll immediately. Waiting only shrinks the number of draws you have left to find one.`,
        ],
      },
      {
        h2: 'Today and Casual',
        paragraphs: [
          `In Today, the daily ranked game, everyone gets the same six teams in the same order, and the re-rolls are the same for everybody too: two players who re-roll the same round the same number of times land on the same team. Nobody gets luckier dice than you, so the skill is in deciding when to roll. After the day is over you can compare notes with anyone who played: a re-roll that helped them or hurt them tells you what it would have done for you.`,
          `In Casual the board is fresh every game, so re-roll discipline is a skill you can practice with no stakes. Play a few games where you refuse to re-roll at all, and a few where you spend both on the first two spins. The difference in your average record is the value of your own judgment, and you will learn more from it than from any rule of thumb.`,
        ],
      },
      {
        h2: `Three scenarios`,
        paragraphs: [
          `Rules are easier to trust with cases. These use invented ratings.`,
          `Early and flexible. Spin one lands on a team with a 91 receiver and nothing else for any open slot. Take him and keep both re-rolls. A certain 91 at a 22 percent slot is worth more than a draw, and you have five spins to fix the rest.`,
          `Late and specific. The quarterback slot is the only heavy one left, and two spins remain, including this one. The team in front of you has no quarterback above 75. Suppose 8 of the 30 unseen teams could supply one you would be happy with. Without a re-roll you get one more look, which finds one 27 percent of the time. With a re-roll you get two looks, the new team and the next spin, which find one 47 percent of the time. The re-roll adds 20 points of probability to the slot that is worth the most.`,
          `Last spin, small slot. Only tight end is open and the team has a 70 where a typical team offers a 78. The slot is 8 percent, so the gap is about six tenths of a point of strength. A re-roll left unspent at the end of the game is worth nothing, so if you have one, use it. If the new team is worse, you have lost little. If it is better, you have gained a little for free.`,
        ],
      },
    ],
  },

  {
    slug: '12-man-and-16-man-rosters-in-17-0',
    title: '12-man and 16-man rosters in 17-0',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'The bigger rosters add the offensive line and split the defense into real positions. Here are the weights, what they change, and how to adjust your plan.',
    sections: [
      {
        h2: 'What changes',
        paragraphs: [
          `The six-man game gives you one defender slot and no offensive line. The 12-man and 16-man rosters fix both. Defense is split into edge rusher, defensive tackle, linebacker, cornerback and safety, and the offensive line gets its own slots. You still spin once per slot, one pick per team, and you still get two re-rolls in Easy mode.`,
          `The main effect is that no single slot decides the season. Quarterback falls from 30 percent of team strength to 20 percent in the 12-man game and 19 percent in the 16-man game. A weak pick hurts less. There are also more places to have one.`,
        ],
      },
      {
        h2: 'The 12-man weights',
        paragraphs: [
          `The 12-man roster is quarterback, running back, two receivers, a tight end, one offensive lineman, an edge rusher, a defensive tackle, a linebacker, a cornerback, a safety and a head coach. Weights follow positional value, the same way they do in the six-man game.`,
        ],
        table: {
          caption: 'Slot weights in the 12-man roster',
          head: ['Slot', 'Weight', 'Wins from +10 grade'],
          rows: [
            ['Quarterback', '20%', '1.31'],
            ['Running back', '10%', '0.65'],
            ['Wide receiver 1', '9%', '0.59'],
            ['Head coach', '9%', '0.59'],
            ['Edge rusher', '8%', '0.52'],
            ['Cornerback', '8%', '0.52'],
            ['Wide receiver 2', '7%', '0.46'],
            ['Offensive lineman', '6%', '0.39'],
            ['Defensive tackle', '6%', '0.39'],
            ['Linebacker', '6%', '0.39'],
            ['Safety', '6%', '0.39'],
            ['Tight end', '5%', '0.33'],
          ],
        },
        closing: [
          `Quarterback is still the biggest single slot, but it is now one pick out of twelve. A 10-point upgrade there is worth about 1.3 wins, against 2.0 in the six-man game. Everything else is a small number, so the way to build a strong 12-man roster is to avoid holes rather than to chase one superstar.`,
        ],
      },
      {
        h2: 'The 16-man weights',
        paragraphs: [
          `The 16-man roster adds a third receiver, two more offensive linemen and a second cornerback. Quarterback is 19 percent, running back 8, the three receivers 7, 6 and 4, tight end 4, the three offensive linemen 5, 4 and 4, edge rusher 7, defensive tackle 5, linebacker 5, the two cornerbacks 6 and 4, safety 5 and head coach 7. They add to 100.`,
          `The first receiver and first cornerback carry more than the others at their position, so take your best one early and fill the rest later. The line is 13 percent in total across three slots, about two thirds of what the quarterback is worth. Do not leave it to the last spins.`,
        ],
      },
      {
        h2: 'Grading the offensive line',
        paragraphs: [
          `Linemen are graded on blocking, not on a name you recognize. The formula is pass blocking 30 percent, run blocking 30, strength 20, awareness 10 and agility 10. A tackle who wins on strength and pass sets and an interior lineman who wins on run blocking can grade the same.`,
          `That makes the line the slot where the overall rating on the board is more useful than anything you remember. Few fans can rank offensive linemen from memory, and the ratings are the one place a casual fan and a scout read the same sheet. In Hard mode, where ratings are hidden, offensive linemen are the slot where expensive guessing happens, so take the one you are most confident about and move on.`,
        ],
      },
      {
        h2: `The full 53-man game`,
        paragraphs: [
          `The biggest roster is the whole team: 53 players and a head coach. That is 54 spins, so the reel comes around to franchises again (each player can still be drafted only once), and Easy mode gives you five re-rolls instead of two. Every position has a depth chart. The starters carry nearly all the weight, and the backups count a sliver, so a bad third-string quarterback costs a little and a bad starter costs a lot.`,
          `The weights are normalized to add to 100 percent. The first quarterback is about 14 percent by himself. The table shows each position group with its depth, which is where the strategy lives: the offensive line and the receivers are each worth more than the whole secondary, and kickers and punters together are worth about one percent.`,
        ],
        table: {
          caption: 'Share of team strength by position group in the 53-man game',
          head: ['Group', 'Share', 'Spots'],
          rows: [
            ['Quarterback', '16.6%', '3'],
            ['Offensive line', '14.0%', '9'],
            ['Wide receiver', '13.4%', '6'],
            ['Cornerback', '9.6%', '6'],
            ['Edge rusher', '9.4%', '5'],
            ['Linebacker', '7.4%', '6'],
            ['Running back', '7.2%', '4'],
            ['Safety', '6.8%', '5'],
            ['Defensive tackle', '6.4%', '4'],
            ['Tight end', '4.1%', '3'],
            ['Head coach', '3.8%', '1'],
            ['Kicker and punter', '1.3%', '2'],
          ],
        },
        closing: [
          `With 54 picks, the draft is a long exercise in not wasting spins. Fill the starters at the heavy groups first. A backup tight end worth 0.4 percent is the right home for a spin where nobody useful is left, and it is the only kind of spin where taking the best remaining name at a low-weight spot is correct.`,
        ],
      },
      {
        h2: `A sample 12-man draft, with invented ratings`,
        paragraphs: [
          `Here is how a draft can go, using invented numbers so the reasoning is easy to follow. Spin one lands on a team with a 93 quarterback and an 88 receiver. Take the quarterback: he is 20 percent of the roster. Spin two offers an 86 running back and nothing else of use. A running back is 10 percent, so he is worth taking.`,
          `By spin six you have a quarterback, a back, a receiver and a tackle, and the open slots are a safety, a linebacker, a tight end, a defensive tackle, a cornerback, an edge rusher, a second receiver and a coach. A team in front of you has a 79 safety and a 71 tight end. Neither is good. This is the moment for a re-roll, because both open slots are small ones and the next team may offer a defensive player in the high 80s at a larger weight.`,
          `The shape is the lesson. Early picks go to the heavy slots at the best grade available. Middle picks fill gaps. Late picks fill whatever is left, and the re-rolls go to spins where nothing in front of you moves the roster.`,
        ],
      },
      {
        h2: 'How to adjust your plan',
        paragraphs: [
          `Think in tiers instead of stars. With twelve or sixteen spins and two re-rolls, you will see a team with a weak option at the slot you need many times. Fill the heaviest open slot with the best grade on the board, and do not chase a 95 at a six percent slot while a 78 sits in a ten percent slot.`,
          `Use the re-rolls on holes. A team that offers nothing for any open slot above 6 percent is a team to throw back. And keep the [slot values from the six-man guide](/blog/how-to-draft-a-17-0-roster) in mind as a sanity check: whatever format you play, the quarterback is the slot where one upgrade moves the record the most.`,
        ],
      },
    ],
  },

  {
    slug: 'hard-mode-17-0-drafting-from-memory',
    title: 'Hard mode in 17-0: drafting from memory',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'No ratings, no re-rolls and a search box. How the mode works, what to remember about each position, and where memory misleads.',
    sections: [
      {
        h2: 'What Hard mode removes',
        paragraphs: [
          `Hard mode hides the ratings, makes you type a player's name to draft him, and gives no re-rolls. The grades are revealed on the result page, after the season is simulated. The scoring is the same as Easy mode, and Hard results carry a Hard tag so they can be filtered on the leaderboard.`,
          `The name search suggests players after one letter, so you do not need to spell anything perfectly. What you do need is a reason to type one name rather than another, and that reason has to come from what you know about football.`,
        ],
      },
      {
        h2: 'Use the weights to decide what to remember',
        paragraphs: [
          `You cannot see ratings, but you still know how the game values positions. Quarterback is 30 percent, so the best quarterback you can name is worth more than the best at any other slot. Wide receiver is 22 and running back 18. If the team in front of you has a famous quarterback in his prime, that is the pick.`,
          `For the smaller slots the question is how much a mistake costs. A wrong guess at tight end or coach costs about half a win. A wrong guess at quarterback costs two. Spend your confidence where the weight is.`,
        ],
      },
      {
        h2: 'What each position grade rewards',
        paragraphs: [
          `Knowing the formula tells you which kind of player grades high, even without a number. Quarterbacks are graded on accuracy at depth, accuracy at mid range, accuracy under pressure, power, awareness, speed and play action. A mobile quarterback who misses throws grades below a still-footed one who does not. Receivers are graded 25 percent on catching and 20 on route running, so a polished route runner with sure hands beats a faster player with drops.`,
          `Running backs lean on vision, carrying and speed in equal parts, which favors the back who finds the hole and keeps the ball over the one who is only fast. Corners are graded 25 percent on man coverage and 20 on zone, so a shutdown man defender grades well even if he gets fewer interceptions than the player next to him.`,
        ],
      },
      {
        h2: 'Where memory misleads',
        paragraphs: [
          `Reputation outlives performance. A star whose best seasons were three years ago is still a name you reach for, and the grades were drawn from the current ratings, which update during the season. A young player who broke out late may be rated far above his fame. When two players are close in your memory, lean toward the one who has played well recently.`,
          `The same goes for teams. The reel shows a franchise, not a roster you have studied. Do not assume a team has a good player at a slot because the team is good. Great teams win with depth, and the best tight end in the league plays for a different team than you think about half the time.`,
        ],
      },
      {
        h2: 'A routine that works',
        paragraphs: [
          `Before you type, name the best player you know at the slot you are filling, then ask whether he is still in his prime and still on this team. If you cannot name anyone, the grade cost of a guess is smaller at low-weight slots, so save your weak knowledge for tight end, defense and coach and let it cost you there.`,
          `After the game, compare the result page against your picks. The page lists every grade, which turns each Hard game into a free lesson in what the ratings actually think of the players you trust. Play a few Easy games first if you want to calibrate, then switch. The [slot-by-slot draft guide](/blog/how-to-draft-a-17-0-roster) is a good primer on where to spend your confidence.`,
        ],
      },
      {
        h2: `Typing and search`,
        paragraphs: [
          `Type a letter and the board lists the players on the team in front of you who fit an open slot. Type coach to see the head coach. If you type a name that is not on the team, the game says so and nothing is spent, so a typo costs you nothing. Because the list only shows players who can fill a slot you still have open, a missing name often means the slot is taken, not that you misspelled it.`,
        ],
      },
      {
        h2: `A Hard draft, step by step`,
        paragraphs: [
          `Spin one lands on a team with a famous quarterback in his late thirties and a young one you barely know. Reputation says take the veteran. Ask what the formula pays for: accuracy at every depth, throwing under pressure and awareness make up most of a quarterback grade. A veteran who still throws accurately under pressure grades well. One whose arm and legs have faded does not. If you know of a decline, trust the young player. If you do not, trust the track record and move on.`,
          `Spin two lands on a team with no quarterback you would take and a receiver you know is elite. That is a fair pick at 22 percent, but you still need the quarterback. Without ratings, your only protection is that you know the league: a team with a bad offense usually has a bad quarterback, so the later spins are where a name you recognize will come from. Take the receiver and keep a re-roll for the quarterback spin.`,
        ],
      },
      {
        h2: `Scoring and the leaderboard`,
        paragraphs: [
          `Hard results are tagged Hard. The Today leaderboards for 17-0 and Build a Player have a Hard filter, so you can see how you rank against other players who drafted blind. The simulation is the same as Easy mode, which means a Hard 17-0 is exactly as hard to earn in strength terms, and much harder to draft.`,
          `Try it after you have a feel for the grades. Play Easy games until you can predict a player's rough grade before you see it, then switch. If your Hard results are close to your Easy ones, you know the league. If they are far lower, the gap is the part of your knowledge that was borrowed from the screen.`,
        ],
      },
    ],
  },

  {
    slug: 'all-time-mode-legends-and-coaches',
    title: 'All-time mode: how legends and coaches are graded',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'Each franchise brings its greats next to today\'s roster. How a retired player\'s best season becomes a grade, what the mode leaves out, and how to draft from the mix.',
    sections: [
      {
        h2: 'What All-time mode adds',
        paragraphs: [
          `In All-time mode, every franchise's board holds its current roster plus its greats. A spin that lands on the 49ers can offer a current quarterback or a legend from the 1980s and 1990s, each with a grade on the same 0 to 99 scale. The finished roster is graded and simulated like any other, with its own win line, which is set harder than the current one to account for how strong the legends make a board.`,
          `Today, the ranked daily game, always uses current rosters, so All-time is a Casual mode. If you have only played current rosters, it is a different game: the best picks are often not the players you know best.`,
        ],
      },
      {
        h2: 'How a legend gets a grade',
        paragraphs: [
          `Players from past decades have no Madden-style attribute sheets in our data, so their grades are built from their real production. The worker reads every franchise's season stat leaders since 1980 from ESPN. Each season is scored for the player's position group: passing yards, touchdowns and rating for quarterbacks, rushing and receiving yardage and scores for backs and receivers, sacks and tackles for linemen and linebackers, interceptions and tackles for defensive backs.`,
          `A season is then divided by that year's starter level at the group, which is the average of its top 32 players. That is what keeps a 1984 passing year from being buried by the passing numbers of the 2020s, and what keeps strike seasons from being punished. The result is placed on the grade range that today's players get at the same group, so a historic season lands in the 90s and a solid starter near 75. Each retired player keeps his best season with each franchise, and a franchise keeps its top few at each position.`,
        ],
      },
      {
        h2: 'What the mode leaves out',
        paragraphs: [
          `Two gaps are worth knowing. ESPN keeps no stats for offensive linemen or kickers, and none for coaches by season, so those slots in All-time mode come from current players plus a short list of legends rated by EA Sports Madden NFL, such as Anthony Munoz. We do not invent grades for the missing positions. A 12-man or 16-man All-time roster will have more current players on the line than anywhere else.`,
          `Players who are on a current roster are never legends, so a veteran does not appear twice on the same board. And a player who starred for two franchises can appear on both boards, but once he is on your roster he is left off every board that follows.`,
        ],
      },
      {
        h2: 'Legendary head coaches',
        paragraphs: [
          `All-time mode puts each franchise's best-known head coaches next to its current one. Belichick with the Patriots, Shula with the Dolphins, Lombardi with the Packers, Noll with the Steelers and about sixty others, so every franchise has at least one. A legend is graded on his record with that franchise: winning percentage, titles, playoff trips and years, placed on the same scale as today's coaches. His seasons and record show on his row.`,
          `A legend counts only for the team you spun. Lombardi on the Packers board is a Packers coach, not a free agent. The slot is 9 percent of team strength, so a coach at 99 over an 88 is worth about 1 point of strength, or two thirds of a win. Take him if the team has nothing better for a bigger slot, not as a first choice.`,
        ],
      },
      {
        h2: 'How to draft from the mix',
        paragraphs: [
          `Compare the numbers, not the names. A legend's row shows his grade and his season line, such as a rushing total or a sack count, so you can see what the grade is built from. Players you know from highlights may grade below a lesser-known contemporary who had a better year. Fall back on the [slot weights](/blog/how-to-draft-a-17-0-roster): a legend at quarterback or receiver is worth more than a legend at tight end.`,
          `Hard mode applies here too: the season lines are hidden, and you type names. That is a good test of how well you actually know the history. Play a few Casual games first, using the stat lines as a guide to how the grade is built, then try it without them.`,
        ],
      },
      {
        h2: `Reading a legend's row`,
        paragraphs: [
          `A legend's row carries a Legend tag, the season his grade comes from and the line behind it: a rushing total and touchdowns for a back, receptions, yards and touchdowns for a receiver, sacks and tackles for a pass rusher. Two legends with the same grade can be very different players, so use the line to judge who fits your needs. It is the one place the mode shows its work.`,
          `In Hard mode the season lines are hidden along with the ratings, and you type names. That is a good test of how well you actually know the history. Play a few Casual games first, using the lines as a guide to how the grade is built, then try it without them.`,
        ],
      },
      {
        h2: `Why All-time has its own win line`,
        paragraphs: [
          `A board that mixes legends and current stars is stronger than a current-only board. Using the same win line would make a perfect season far too easy. All-time has its own line for each roster size, set the same way as the others: from how real players actually do. A grade that is excellent in the current mode can be merely good here, because the bar moved with the talent.`,
          `That is also why a record from one mode should not be compared with a record from the other. If you want a clean measure of how well you draft, stay in one mode for a while and watch your average.`,
        ],
      },
    ],
  },

  {
    slug: '82-0-strategy-eras-positions-and-fit',
    title: '82-0 strategy: eras, positions and fit',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'Five spins, five eras, one starting five. How the out-of-position penalty works, why playmakers are free at the point, and how to build a lineup that grades evenly.',
    sections: [
      {
        h2: 'How the game is laid out',
        paragraphs: [
          `82-0 has five rounds. Each round spins an era and then a franchise, and you draft one player from that team in that era. The eras are the 1980s (from 1985, where ESPN's per-player data starts), the 1990s, 2000s, 2010s and 2020s, and each era can be used once, so five picks cover five decades. Easy mode gives you two re-spins for the era and two for the team. Hard mode hides the stats and gives none.`,
          `Every player on a board appears at his best season with that franchise in that era, graded from his real per-game stats on a 40 to 99 scale. A player needs at least 20 games with the franchise that season to be on its board. When all five slots are filled, the lineup is simulated over 82 games.`,
        ],
      },
      {
        h2: 'Position fit is the second game',
        paragraphs: [
          `You choose which of the five slots, point guard, shooting guard, small forward, power forward and center, each pick plays. A player in his natural slot keeps all of his value. One spot over he keeps 94 percent, two spots over 82 percent, and farther than that 70 percent. A center playing guard is not a small adjustment. He is a 30 percent discount.`,
        ],
        table: {
          caption: 'What a 90-value player grades at when slotted away from his position',
          head: ['Distance from natural slot', 'Share of value kept', 'A 90 becomes'],
          rows: [
            ['Natural slot', '100%', '90.0'],
            ['One slot over (shooting guard at the point)', '94%', '84.6'],
            ['Two slots over (power forward at shooting guard)', '82%', '73.8'],
            ['Three or four slots over (center at guard)', '70%', '63.0'],
          ],
        },
        closing: [
          `Many players are listed at two positions, such as guard-forward or forward-center, and are natural at both. And you can move players between slots until you submit the lineup, so you do not have to decide at the moment of the pick. Draft the best available player and solve the arrangement at the end, but check that an arrangement exists. Three centers and two small forwards is a lineup that cannot grade well however good they are.`,
        ],
      },
      {
        h2: 'Playmakers play the point for free',
        paragraphs: [
          `A season with seven or more assists a game runs an offense, and the game treats it that way: that player counts as a point guard at no cost, whatever he is listed as. Big men who pass, like a center averaging eight assists, can fill the one slot that is otherwise hardest to cover.`,
          `The point guard slot is usually the one that gets filled last and worst, because a point guard in his best season is a heavily contested pick. Look for the forward or center whose assist line qualifies. It gives you the flexibility to draft the best player on the board and fix the guard spot with someone whose value would otherwise be wasted.`,
        ],
      },
      {
        h2: 'Balance beats a single superstar',
        paragraphs: [
          `Team strength is the plain average of the five graded slots, so each is a flat 20 percent. There is no quarterback-style weight to chase. A 97 at one slot and 70 at another averages the same as two 83s. What moves the average is the weakest link, because the cheapest improvement is almost always raising your lowest grade.`,
          `A lineup at 94.0 or above locks in a perfect season at the base line. The live line moves a little each night, so trust the number on your result page. Few lineups clear it. Most of the work is avoiding a weak slot: letting one slot fall 20 points costs four points of average, and it takes two ten-point gains elsewhere to get that back.`,
        ],
      },
      {
        h2: 'Using the re-spins',
        paragraphs: [
          `Two kinds of re-spin means two different bets. An era re-spin moves to a different decade and keeps the franchise when it also played in the new one, so only the era changes. A team re-spin keeps the era and swaps the franchise. Use an era re-spin when the franchise is right but the decade is thin for it, and a team re-spin when the decade is right and the team's best players at your open slots are below the standard you want.`,
          `Eras you have already drafted from drop out of the spin, so every spin lands on a decade you still need. That has a consequence on the last round: only one era is left, so an era re-spin has nowhere to go and only team re-spins work. Spend era re-spins early, when they have the most places to go, and keep a team re-spin for the end.`,
        ],
      },
      {
        h2: `What the data covers`,
        paragraphs: [
          `Stats come from ESPN's per-game records, which start with the 1984-85 season, so the 1980s era runs from the 1985 season through 1989. Each player is shown at the single season that grades best for that franchise in that era, not at his career average. A player with fewer than 20 games for a team in a season does not appear on its board, which keeps late-season cameos off the list.`,
          `Standard mode is a different edition. It grades today's rosters on current NBA 2K overall ratings instead of historical stats, with two team re-spins and no eras. It is a Casual mode, and results credit NBA2KLab for the ratings. Hard mode hides the numbers in either edition.`,
        ],
      },
      {
        h2: `A sample draft, with invented numbers`,
        paragraphs: [
          `Suppose round one lands on the 2010s and a franchise with a 93 wing. Take him at small forward. Round two lands on the 1990s: a 90 center and an 80 guard. Take the center. Round three, the 2000s, offers an 88 point guard, and he fills the point. Round four lands on the 1980s and an 86 shooting guard. Round five, the last era left, offers an 84 power forward.`,
          `The five values are 88, 86, 93, 84 and 90, which average 88.2. At the base line of 70 and a span of 24, that projects to (88.2 minus 70) divided by 24, times 82, which is about 62 wins before the roll. To lock in 82-0 the average has to reach 94. Every point of lineup strength is worth about 3.4 wins, so a lineup that is two points short is not a few games off a perfect season, it is seven.`,
        ],
      },
      {
        h2: `Mistakes to avoid`,
        paragraphs: [
          `The same errors turn up in most losing lineups.`,
        ],
        list: [
          `Drafting five of the same position. Check the arrangement as you go, because a center at guard keeps only 70 percent of his value.`,
          `Chasing the biggest name instead of the best season. The board shows the single best season in the era, so a star's ordinary year in a weak era can grade below a role player's best.`,
          `Spending the era re-spins late. They have the most places to go in the first rounds. In the last round only one era is left and only team re-spins work.`,
          `Forgetting playmakers. A forward or center at seven assists a game plays the point at no cost, which frees the guard spot for the best available player.`,
        ],
      },
    ],
  },

  {
    slug: '162-0-guide-lineup-rotation-and-eras',
    title: '162-0 guide: lineup, rotation and eras',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'Eleven spots, a double-weight starter and a bullpen that counts a half more. How to read the board, what a move around the field costs, and how era limits shape a draft.',
    sections: [
      {
        h2: 'The roster',
        paragraphs: [
          `162-0 has eleven spots: catcher, first base, second base, third base, shortstop, left field, center field, right field, designated hitter, a starting pitcher and a reliever. Each of the eleven spins lands on an era since 1970 and then a franchise, and you take one player from that team in that era. No era can supply more than two of your picks. Easy mode gives you two era re-spins and two team re-spins. Hard mode hides the stats and gives none. A Right now mode skips the eras and drafts from the current season only.`,
          `Every player appears at one real season, graded against the league of that year. That is the key difference from a ratings game: a .900 OPS means something different in 1968-style pitching than in a high-offense year, and the grade accounts for it.`,
        ],
      },
      {
        h2: 'Pitching counts for more',
        paragraphs: [
          `Team strength is a weighted average of the eleven grades. Nine hitters count once each, the starter counts double and the reliever counts one and a half. That is 12.5 shares in total, so the starter is 16 percent of the roster, the reliever 12 percent and each hitter 8 percent.`,
          `The starting pitcher is therefore worth two hitters. A 95 starter over an 80 is a fifteen-point gain at 16 percent, 2.4 points of strength. The same fifteen points at second base is 1.2. The reliever slot is cheaper to fill because relievers are graded with the ERA credit capped, but a one-inning specialist is still 12 percent of the roster.`,
        ],
      },
      {
        h2: 'What a position change costs',
        paragraphs: [
          `Hitters can be drafted into their own position or designated hitter, and moved around the field afterward at a cost. The share of value a hitter keeps depends on how far the move is.`,
        ],
        table: {
          caption: 'Share of value kept when a hitter plays a different spot',
          head: ['Move', 'Value kept'],
          rows: [
            ['Natural position', '100%'],
            ['Anyone at designated hitter', '97%'],
            ['Anyone at first base', '93%'],
            ['Center field to a corner outfield spot', '97%'],
            ['Corner outfielder to the other corner', '92%'],
            ['Shortstop to second or third base', '96%'],
            ['Second or third baseman to another infield spot', '90%'],
            ['Infielder to the outfield, or the reverse', '84%'],
            ['First baseman or DH into the field', '80%'],
            ['Anyone to or from catcher', '75%'],
          ],
        },
        closing: [
          `Pitchers do not change roles for free. A starter in the reliever spot keeps 90 percent, and a reliever starting keeps 75. Hitters never pitch and pitchers never bat. Catcher is the hardest spot to cover from outside, so a catcher is worth a spin when you see a good one.`,
        ],
      },
      {
        h2: 'Reading the board by position',
        paragraphs: [
          `The board groups players by position: catchers, infielders, outfielders, designated hitters, starters and relievers. Once a position and the designated hitter spot are both filled, remaining players at that position are greyed out, because a hitter can be drafted only into his own spot or DH. Use that to plan: if you have drafted a first baseman and a designated hitter, no more first basemen can be taken, and your last hitter slots must come from other positions.`,
          `Hitters carry a bonus or penalty for position difficulty built into their grade: catchers and shortstops get credit, first basemen and designated hitters give a little back. So a .900 OPS at shortstop grades higher than the same line at first base. That is a feature: it is why a premium defender is worth a premium spin.`,
        ],
      },
      {
        h2: 'Eras and the two-pick limit',
        paragraphs: [
          `The six eras are the 1970s through the 2020s, and no era gives more than two picks. Eleven picks across six eras means at least five eras are in play in any lineup. That blocks the easiest strategy, which is to re-spin until you land on a single great decade and fill the lineup from it.`,
          `Use the limit. Eras that have given two picks drop out of the spin, so later spins draw from a shrinking set of decades and a late era re-spin may have nowhere to go. Count how many picks each era has before you choose a re-spin. And remember the grades are relative to the league that year, so a pitcher from a high-run era with an ERA that looks ordinary can grade very well. Read the grade, not the raw line.`,
        ],
      },
      {
        h2: 'How hard is a perfect season',
        paragraphs: [
          `The win line is fitted so that a careful drafter using every re-spin goes 162-0 about two percent of the time. The base line needs a roster strength of 94.0, and one point of strength is worth almost seven wins, so a small gap is a big difference in the record. The [math of a perfect season](/blog/how-rare-is-a-perfect-season) explains why winning every game of a long season is so difficult in the first place.`,
        ],
      },
      {
        h2: `Right now mode`,
        paragraphs: [
          `Right now skips the eras and spins teams from the current season only, graded on this year's stats. It is a good way to learn the board, because every player is someone you may have watched this year. With no era limit and no era re-spins, the game is a purer test of lineup construction: eleven spins, one franchise each, and the only decision is who goes where.`,
        ],
      },
      {
        h2: `A sample draft, with invented numbers`,
        paragraphs: [
          `Take a lineup with these invented grades: catcher 80, first base 78, second base 82, third base 76, shortstop 88, left field 79, center field 84, right field 81, designated hitter 77, starter 90 and reliever 85. The nine hitters add to 725. The starter counts double, 180, and the reliever one and a half, 127.5. The total is 1,032.5 over 12.5 shares, so team strength is 82.6.`,
          `At the base line of 70 and a span of 24, that projects to (82.6 minus 70) divided by 24, times 162, about 85 wins before the roll. Now compare two upgrades of eight points each. Swap the starter for a 98 and strength rises to 83.9 and the projection to about 94 wins. Swap the second baseman for a 90 and strength rises to 83.2 and the projection to about 89. The same eight points are worth 8.6 wins at starter and 4.3 at second base. That is the pitching weight at work.`,
        ],
      },
      {
        h2: `Mistakes to avoid`,
        paragraphs: [
          `A few habits cost wins over a 162-game season.`,
        ],
        list: [
          `Treating the starter like another hitter. He is worth two of them, and the best starter on the board is nearly always a better use of a spin than the best second baseman.`,
          `Ignoring the fit table. A shortstop at second base keeps 96 percent of his value, but a first baseman in the outfield keeps 80, and a catcher is the costliest spot to cover from outside.`,
          `Using both team re-spins early. With eleven spins, a late spin that lands on a thin team is the one you want a re-spin for.`,
          `Reading raw lines instead of grades. Grades are measured against that season's league, so a modest-looking line from a pitcher's era can outrank a gaudy one from a hitter's.`,
        ],
      },
    ],
  },

  {
    slug: '44-0-guide-drafting-a-wnba-lineup',
    title: '44-0 guide: drafting a WNBA lineup',
    date: '2026-10-27',
    category: 'Strategy',
    excerpt: 'Five spins, one franchise each, this season\'s players and a 44-game schedule. How the lineup is graded and what to watch for at each position.',
    sections: [
      {
        h2: 'How the game works',
        paragraphs: [
          `44-0 is the WNBA version of the basketball game. Each of five spins lands on a franchise from the current season. You draft one player from that team, assign her to point guard, shooting guard, small forward, power forward or center, and the lineup plays a projected 44-game season, the length of the current WNBA schedule. Easy mode gives you two team re-spins. Hard mode hides the stats and gives none.`,
          `The game drafts from this season only, so the ratings stay current. Every player is shown with her current-season line from ESPN's per-game stats, graded on the same 40 to 99 scale as the NBA game. She needs at least 10 games with the franchise to appear on its board.`,
        ],
      },
      {
        h2: 'How a season becomes a grade',
        paragraphs: [
          `The grade blends points, rebounds, assists, steals and blocks, subtracts turnovers, and adds credit for shooting efficiency above league norms. A player with few games is pulled toward replacement level, so a hot start over a handful of games cannot top the board. The top of the scale is bent, so only the greatest seasons sit near 99.`,
          `Team strength is the plain average of the five slot grades. The base line for a perfect season is a lineup strength of 90.0, and each point of strength is worth about 1.8 wins over 44 games. That makes a small improvement at any slot matter: raising one 80 to a 90 adds two points to the average and almost four wins.`,
        ],
      },
      {
        h2: 'Position fit and playmakers',
        paragraphs: [
          `Fit works the way it does in 82-0. A player in her natural slot keeps all of her value, one slot over keeps 94 percent, two slots over 82 percent, and farther 70. Players listed at two positions, like guard-forward, are natural at both.`,
          `One number differs. WNBA assist totals run lower than the NBA's, so a player averaging five assists a game runs the offense and plays the point at no cost. A forward who passes well can fill the guard spot, which makes the point guard slot the easiest one to cover with a surprise.`,
        ],
      },
      {
        h2: 'Drafting tips',
        paragraphs: [
          `Draft the best grade and solve positions at the end. The five slots are equal in weight, so there is no reason to fill a position early. The exception is protecting the arrangement: with five picks, you need a lineup that can be assigned without putting anyone three slots from home.`,
        ],
        list: [
          `Take any grade in the high 90s immediately. Few boards have one.`,
          `Check the games played. Players near the 10-game cutoff are pulled toward the middle, so their grades understate their rate stats.`,
          `Keep a re-spin for the last round. A team with no useful player for your last open slot is the one you want to throw back.`,
          `Forwards who pass are the cheapest way to cover the point guard spot. At five assists a game a forward plays there with no penalty.`,
        ],
        closing: [
          `Two more things matter. A team re-spin changes only the franchise, and since the game drafts from one season, there is no era to re-spin. And the perfect-season board counts how often you manage 44-0, with Casual perfect seasons capped at five a day. The [guide to 82-0](/blog/82-0-strategy-eras-positions-and-fit) covers the same fit rules in more depth.`,
        ],
      },
      {
        h2: `How 44-0 differs from 82-0`,
        paragraphs: [
          `The two basketball games share an engine and a lot of rules, but the numbers differ because the leagues do. A season is half as long, there is only one season to draft from, and assists run lower.`,
        ],
        table: {
          caption: 'Rules that differ between 82-0 and 44-0',
          head: ['Rule', '82-0 (NBA)', '44-0 (WNBA)'],
          rows: [
            ['Seasons you draft from', 'Five eras, 1980s to 2020s', 'The current season'],
            ['Games in the season', '82', '44'],
            ['Lineup strength that locks in a perfect season (base line)', '94.0', '90.0'],
            ['Wins per point of lineup strength', '3.4', '1.8'],
            ['Games needed to be on a franchise board', '20', '10'],
            ['Assists a game to play the point at no cost', '7', '5'],
            ['Re-spins in Easy mode', 'Two era, two team', 'Two team'],
          ],
        },
        closing: [
          `The lower perfect line, 90 against 94, is the main thing to absorb. WNBA lineups can reach it because a single season is a smaller, more even pool, and each point of strength is worth fewer wins over 44 games. Both lines are base values that the nightly balance job nudges a little, so the number on your result page is the one to trust.`,
        ],
      },
      {
        h2: `A sample draft, with invented numbers`,
        paragraphs: [
          `Suppose spin one lands on a team whose best player is a guard valued at 91. Take her. Spin two offers a 79 forward and an 84 center. Take the center, who plays the five. Spin three lands on a forward valued at 93 whose assists line is above five a game, so she can play the point or a wing. Take her and keep the arrangement open. Spin four offers nothing above 76 at any open slot, so spend a team re-spin, and the new team has an 88 wing. Spin five fills the last slot with an 85.`,
          `The five values are 91, 84, 93, 88 and 85, which average 88.2. At the base line of 66 and a span of 24, the lineup projects to (88.2 minus 66) divided by 24, times 44, which is about 41 wins before the roll. To reach 44-0 the average has to climb to 90. Replacing the 84 with a 93 gets there in one move, which is why one weak slot is the first thing to fix.`,
        ],
      },
      {
        h2: `Mistakes to avoid`,
        paragraphs: [
          `Most lost wins in 44-0 come from the same few habits.`,
        ],
        list: [
          `Filling positions in order. The five slots weigh the same, so the best grade available is almost always the right pick, and the arrangement can be solved at the end.`,
          `Ignoring games played. A player near the 10-game cutoff is pulled toward the middle, so a great per-game line over a few games reads lower than it looks.`,
          `Spending both re-spins early. Keep one for the last round, when a bad team has no spins behind it to make up for it.`,
          `Skipping the arrangement check. Four forwards and a center leave two guard spots filled by players one to three slots from home, which costs 6 to 30 percent of their value.`,
        ],
      },
    ],
  },
];
