// Fantasy football explainers written to match the tools on the fantasy hub. Numbers come from src/lib/fantasy/rank.ts and src/lib/game/fantasy.ts.
import type { BlogPost } from './types';

export const FANTASY_POSTS: BlogPost[] = [
  {
    slug: 'ppr-half-ppr-and-standard-scoring-explained',
    title: 'PPR, half PPR and standard scoring, explained',
    date: '2026-10-27',
    category: 'Fantasy football',
    excerpt: 'One point per catch changes who is valuable. Worked examples of the three scoring formats, who gains and loses in each, and what the fantasy tools here assume.',
    sections: [
      {
        h2: 'The three formats',
        paragraphs: [
          `Most fantasy football leagues score the same way for everything except catches. A player earns one point for every ten rushing or receiving yards, six points for a touchdown, one point for every 25 passing yards, four points for a passing touchdown, and loses two points for an interception or a lost fumble. Leagues differ on the details, so check yours, but those are the common defaults.`,
          `The difference between the formats is what a reception is worth. Standard scoring gives nothing. Half PPR gives half a point for each catch. PPR, short for points per reception, gives a full point. That one setting changes the value of an entire class of players.`,
        ],
      },
      {
        h2: 'The same games, three scores',
        paragraphs: [
          `Here are three invented stat lines, scored under each format. The first is a receiver who catches six passes for 70 yards and a touchdown. The second is a deep threat who catches three for 110 yards and a touchdown. The third is a running back with 100 rushing yards, one catch for 8 yards and a touchdown.`,
        ],
        table: {
          caption: 'Fantasy points for three invented stat lines under each scoring format',
          head: ['Stat line', 'Standard', 'Half PPR', 'PPR'],
          rows: [
            ['Receiver: 6 catches, 70 yards, 1 TD', '13.0', '16.0', '19.0'],
            ['Deep threat: 3 catches, 110 yards, 1 TD', '17.0', '18.5', '20.0'],
            ['Back: 100 rush yards, 1 catch for 8 yards, 1 TD', '16.8', '17.3', '17.8'],
          ],
        },
        closing: [
          `In standard scoring the deep threat beats the possession receiver by four points. In PPR the gap is down to one. The back barely moves, because he caught one pass. The catch count is the lever.`,
        ],
      },
      {
        h2: 'Who gains and who loses',
        paragraphs: [
          `PPR rewards volume of targets. Slot receivers, pass-catching tight ends and backs who play on third down all gain value, because they turn short, frequent catches into points. Players who live on touchdowns and long gains gain less, and a workhorse back who runs 25 times and rarely catches a pass is the same player in every format.`,
          `Standard scoring flips that. Touchdowns and yards carry the whole score, so a big-play receiver and a goal-line back look better, and the volume receiver loses the cushion his catches provided. Half PPR sits in the middle and is a common compromise.`,
        ],
      },
      {
        h2: 'How it changes a draft',
        paragraphs: [
          `The positional order shifts. In PPR, top receivers and the few backs who also catch a lot rise toward the first round, and the pass-catching tight end becomes a scarce asset. In standard, the best rushers who score touchdowns are worth more and receivers a little less. The quarterback position is untouched, since quarterbacks do not catch passes, though a rushing quarterback gains in any format.`,
          `Do not let a format change your instinct about talent. A great player is great in all three. What changes is the margin between players of similar ability, and that margin is where the draft is decided. When two players are close, the one with more targets is the pick in PPR and the one with more touchdowns is the pick in standard.`,
        ],
      },
      {
        h2: 'Other settings that matter nearly as much',
        paragraphs: [
          `The catch value is the best-known setting, but it is not the only one that reorders a draft. A few others deserve a look before you rank anyone.`,
        ],
        list: [
          `Passing touchdowns at six points instead of four. A touchdown throw is worth half again as much, so quarterbacks gain about a point and a half for every two passing scores. Pocket passers who throw many touchdowns rise.`,
          `Tight end premium. Some leagues give tight ends extra credit per catch, usually half a point more. That lifts the few tight ends who see many targets and narrows the gap between the elite ones and the rest.`,
          `Yardage bonuses. A bonus for 100 rushing or 100 receiving yards rewards the same players who already score the most. It makes top players a little more valuable and depth a little less.`,
          `Superflex or two-quarterback leagues. Quarterbacks stop being a position you can wait on. The [value over replacement post](/blog/value-over-replacement-fantasy-football-explained) shows how that moves them.`,
        ],
        closing: [
          `The habit to build is reading the settings page before you open a ranking. A list built for a standard league can be wrong in a PPR league by a full round at some positions.`,
        ],
      },
      {
        h2: 'Choosing a format for your own league',
        paragraphs: [
          `If you are setting one up, PPR is the most common choice today because it rewards the players who make games fun to watch: the receivers and backs who touch the ball often. It also makes the scoring less dependent on a single long touchdown, which keeps the matchups closer. Standard is simpler and rewards the big play. Half PPR is a reasonable way to keep both.`,
          `Whichever you pick, tell everyone before the draft and write the settings down. Most disputes in fantasy football come from one person assuming a rule that the league never agreed to.`,
        ],
      },
      {
        h2: 'What the tools on this site assume',
        paragraphs: [
          `The [rankings](/fantasy/rankings), [waiver wire](/fantasy/waivers), [trade calculator](/fantasy/trade) and [cheat sheet](/fantasy/cheat-sheet) all work in PPR points per game, as does the Fantasy lineup in 17-0, which is scored on real PPR points. If your league scores half PPR or standard, treat receivers and pass-catching backs as slightly lower than the tools show, and touchdown-dependent players as slightly higher.`,
          `The values are blended from recent form, the season so far and, early in the year, a projection: 65 percent of the value is the average of the last four weeks, weighted toward the latest, and 35 percent is the season average. The [value over replacement post](/blog/value-over-replacement-fantasy-football-explained) shows how those values turn into an overall order.`,
        ],
      },
    ],
  },

  {
    slug: 'value-over-replacement-fantasy-football-explained',
    title: 'Value over replacement in fantasy football, explained',
    date: '2026-10-27',
    category: 'Fantasy football',
    excerpt: 'Why a running back who scores fewer points can be worth more than a quarterback who scores more. How replacement level works, with a worked example, and what superflex and league size change.',
    sections: [
      {
        h2: 'The question points per game cannot answer',
        paragraphs: [
          `Suppose a quarterback averages 24 points a game and a running back averages 17. The quarterback scores more. Is he the better pick? Not necessarily, because the question that matters is how much better each player is than the one you could have for free. Quarterbacks are plentiful. A team that misses on the top quarterbacks can still start someone who averages 17. Good running backs are scarcer, so the gap between the back you drafted and the back on the waiver wire is bigger.`,
          `Value over replacement, usually shortened to VOR, measures that gap. It is the player's points per game minus the points per game of a replacement-level player at his position. Ranking everyone by VOR puts quarterbacks, backs, receivers and tight ends on one scale.`,
        ],
      },
      {
        h2: 'How replacement level is set',
        paragraphs: [
          `Replacement level is the last starter at the position in your league: the player a team could pick up and start without much thought. The rankings here compute it from the league's size and lineup. A team starts one quarterback, one tight end and about two and a half backs and two and a half receivers, counting the flex spot as half of each. In a 12-team league that makes the replacement player about the 12th quarterback, the 30th back, the 30th receiver and the 12th tight end.`,
          `The replacement level is the value of the player ranked at that spot. Everyone above is worth something. Everyone below is not startable in your league, and the model says so by giving them little or nothing.`,
        ],
      },
      {
        h2: 'A worked example with invented numbers',
        paragraphs: [
          `Say the 12th quarterback averages 17.0 points a game, the 30th back averages 9.0, the 30th receiver 9.5 and the 12th tight end 7.0. Now compare four players.`,
        ],
        table: {
          caption: 'Value over replacement for four invented players in a 12-team league',
          head: ['Player', 'Points per game', 'Replacement', 'Value over replacement'],
          rows: [
            ['Quarterback', '24.0', '17.0', '7.0'],
            ['Running back', '17.0', '9.0', '8.0'],
            ['Wide receiver', '16.5', '9.5', '7.0'],
            ['Tight end', '14.0', '7.0', '7.0'],
          ],
        },
        closing: [
          `The running back ranks first despite scoring seven fewer points a game than the quarterback. The tight end, whose 14.0 would not make a quarterback blink, is worth exactly as much as the quarterback because tight ends fall off a cliff after the first few. This is why a draft by raw points goes wrong: it overpays for the position with the highest scores and underpays for the one with the thinnest supply.`,
        ],
      },
      {
        h2: 'What superflex and league size change',
        paragraphs: [
          `A superflex league lets a second quarterback start in the flex spot, so nearly every team uses two. The model counts that as 1.9 quarterback starters per team, which moves the replacement quarterback from about the 12th to about the 23rd. Quarterbacks suddenly have a much bigger gap above replacement, and a good one becomes a first-round pick.`,
          `League size does the same thing at every position. A 14-team league has a deeper starting pool, so replacement players are worse and every starter is worth more. A 10-team league has more free talent, so the gaps are smaller and the order flattens. The [rankings page](/fantasy/rankings) lets you set both.`,
        ],
      },
      {
        h2: 'A second example: what superflex does to the order',
        paragraphs: [
          `Keep the same invented numbers and suppose the replacement quarterback in a superflex league, about the 23rd, averages 14.0 instead of 17.0. A quarterback who scores 22.0 a game is worth 5.0 over replacement in a one-quarterback league and 8.0 in superflex. A running back at 15.0 is worth 6.0 over a replacement of 9.0 in either.`,
          `In the one-quarterback league the back ranks above the quarterback, 6.0 to 5.0. In superflex the quarterback jumps ahead, 8.0 to 6.0. Nothing about either player changed. Only the number of quarterbacks that have to be started changed, and that moved the free alternative. That is the most important thing VOR teaches: a player has no value on his own, only against the alternative.`,
        ],
      },
      {
        h2: 'Tiers: where the cliffs are',
        paragraphs: [
          `VOR gives you an order. Tiers tell you where the order breaks. A new tier starts wherever the drop to the next player is much bigger than the usual drop in that list: more than 1.6 times the median gap, and at least 0.4 points per game. Players inside a tier are close enough that the choice among them is a matter of taste or matchup. The gap between tiers is real.`,
          `Use tiers for timing. If a tier has two players left and you pick next, take one even if a different position's top player is slightly higher on the list. The next time you pick, that tier will be gone, and the drop to what is left will cost more than the small gain you passed up. The [tier list maker](/fantasy/tier-list) lets you build your own.`,
        ],
      },
      {
        h2: 'What VOR does not know',
        paragraphs: [
          `VOR is a snapshot of average production. It does not know that a player is hurt, that his bye week lands at a bad time, or that his schedule gets harder. It does not know that a rookie is about to take over a job. It treats a steady 15 points a game as equal to a boom-and-bust 15. Use it as the first filter, not the last word.`,
          `The best use is as a check on instinct. When you want a player a round before the numbers say, ask what you are seeing that the model is not. Sometimes the answer is a real injury or a depth chart change. Sometimes it is that you like his name, and the model just saved you a pick.`,
        ],
      },
    ],
  },

  {
    slug: 'snake-draft-math-where-the-value-is',
    title: 'Snake draft math: where the value is at your pick',
    date: '2026-10-27',
    category: 'Fantasy football',
    excerpt: 'Which picks you get from each slot, why every slot has the same average, and how to plan around the wait. With a table of the first six rounds in a 12-team league.',
    sections: [
      {
        h2: 'How a snake draft orders picks',
        paragraphs: [
          `In a snake draft the order reverses every round. With 12 teams, the team picking first in round one picks last in round two, then first again in round three. The pick number for a slot in any round is simple. In an odd-numbered round it is the round number minus one, times the number of teams, plus your slot. In an even-numbered round it is the round number minus one, times the number of teams, plus the number of teams minus your slot, plus one.`,
          `That means the first and last slots get a pair of picks back to back, and the middle slots get an even rhythm. Here are the first six rounds for three slots in a 12-team league.`,
        ],
        table: {
          caption: 'Overall pick numbers in the first six rounds of a 12-team snake draft',
          head: ['Slot', 'Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6'],
          rows: [
            ['1', '1', '24', '25', '48', '49', '72'],
            ['6', '6', '19', '30', '43', '54', '67'],
            ['12', '12', '13', '36', '37', '60', '61'],
          ],
        },
        closing: [
          `The first slot picks first and then waits 22 picks for its second. The twelfth slot picks twelfth, then thirteenth, then waits 22 picks. The sixth slot never waits longer than 12.`,
        ],
      },
      {
        h2: 'Every slot adds up to the same',
        paragraphs: [
          `Over any even number of rounds, every slot's pick numbers add to the same total. For six rounds in a 12-team league, every slot sums to 219: slot one is 1 plus 24 plus 25 plus 48 plus 49 plus 72, and slot twelve is 12 plus 13 plus 36 plus 37 plus 60 plus 61. The average pick number is 36.5 for everyone.`,
          `So no slot has an advantage in total. The difference is the shape. An early slot gets a better first player and then goes through long stretches with nothing. A late slot gets two good players in a row and a longer wait afterward. Neither is better. They call for different plans.`,
        ],
      },
      {
        h2: 'Planning from an early slot',
        paragraphs: [
          `From slot one through three you take the best player on the board and then think about what will survive until your second pick, about 20 picks away. By then, two dozen players will have gone, and the board will look nothing like the one you started with. Plan for the tier you want, not the player: ask which of the tiers will still have someone in it when you come back.`,
          `The risk of the early slot is a run. If four running backs go in a row just before you, the position is thin by your next turn. Take the second tier's best player in the position that is about to dry up, and let the position that is deep wait.`,
        ],
      },
      {
        h2: 'Planning from a late slot',
        paragraphs: [
          `Late slots get two picks back to back at the turn. Use that to take two players from the same tier, or to fill two different needs before the board moves. Slot twelve opens every even round with the first pick, which is the other half of the same advantage.`,
          `The cost is the opening. You do not get the top players, so you need value over replacement from the middle of the board. This is where [value over replacement](/blog/value-over-replacement-fantasy-football-explained) is most useful: a late slot wins by picking the position with the biggest gap above replacement at each turn, not the position everyone else is chasing.`,
        ],
      },
      {
        h2: 'Planning from the middle',
        paragraphs: [
          `The middle slots have the most predictable rhythm and the fewest surprises. Your picks come every 10 to 12 players, so the board in front of you always looks like the board you left, minus about a dozen players. That makes middle slots good for steady value-based drafting: take the highest VOR available and let the other teams make mistakes around you.`,
        ],
      },
      {
        h2: 'The named strategies are all the same idea',
        paragraphs: [
          `Fantasy writers give draft strategies names. Robust RB means taking running backs early. Zero RB means waiting on them and loading up on receivers. Hero RB means one early back and then receivers. Each one is a bet about replacement level, which is exactly what value over replacement measures.`,
          `Zero RB works when running backs are so scarce that the good ones cost a premium you can beat by waiting for the next tier, and when receivers are deep enough to build a lineup. Robust RB works when the gap between the top backs and the replacement back is the biggest on the board. Neither is right in general. The draft in front of you decides, and your slot decides how many choices you have: an early slot can take a scarce back and still reach a receiver tier on the way back, while a late slot gets two picks together and can take one of each.`,
        ],
      },
      {
        h2: 'Tools for the real thing',
        paragraphs: [
          `The [cheat sheet](/fantasy/cheat-sheet) takes your league size and your slot and shows the best players available at each of your picks, in snake order. The [mock draft](/fantasy/mock-draft) lets you practice against computer teams that draft by our rankings, with a roster strip that shows your lineup as it fills. And if the league has not set the order yet, the [draft order randomizer](/fantasy/draft-order) will shuffle team names so nobody can argue about it.`,
          `Run three mock drafts from the slot you have, and notice which of your picks you would take again and which you would not. That habit is worth more than any list of names.`,
        ],
      },
    ],
  },

  {
    slug: 'fantasy-waivers-and-trade-value-explained',
    title: 'Waivers and trades in fantasy football: how the value works',
    date: '2026-10-27',
    category: 'Fantasy football',
    excerpt: 'Who is really available on waivers, what an add count tells you, and why two average players do not make a star. How the waiver wire and trade calculator on this site think.',
    sections: [
      {
        h2: 'What counts as available',
        paragraphs: [
          `The waiver wire here lists players that most leagues have not rostered, with the most added first. The adds are counted across Sleeper leagues in the last 24 hours, and the roster percentage shown next to each name comes from ESPN. Players above roughly 55 percent rostered are treated as taken, because in most leagues they are, and stars are left out for the same reason. If nobody is being added yet, the list falls back to the best recent producers that most leagues have not picked up.`,
          `That definition is on purpose. A waiver list that includes a player rostered in nine leagues out of ten is a list of names you cannot get. The useful list is the one that is still open in yours.`,
        ],
      },
      {
        h2: 'What an add count really tells you',
        paragraphs: [
          `A burst of adds is almost always news, not talent. A starter gets hurt, a backup becomes the starter, and thousands of managers add him within an hour. Being second to the add is a bad bet unless you play in a league where nobody checks. What you can do is use the list to find out why a name moved, and decide whether the reason will last.`,
          `Recent production is the steadier signal. A player averaging real points over the last four weeks is probably in a role. A player who scored once on a long play is not. The waiver wire here ranks by adds when there is news and by recent form when there is not, and shows both so you can tell them apart.`,
        ],
      },
      {
        h2: 'Budget or priority',
        paragraphs: [
          `Leagues claim players in one of two ways. In a priority system, the team at the bottom of the standings goes first, and a claim sends you to the back of the line. In a budget system, usually called FAAB, every team has a pool of money and bids for players. The winner is the highest bid.`,
          `With a budget, the main mistake is spending early on a name everyone wants. A rule that works: do not bid more than half your remaining budget on one player unless he is a starter at a position where you have a hole. And check your bye weeks and injuries before bidding, because a player you cannot start this week is worth less to you than his name suggests.`,
        ],
      },
      {
        h2: 'A weekly routine',
        paragraphs: [
          `Most waiver decisions go better with a routine than with a reaction. The points data on this site refreshes on Monday, Tuesday and Friday mornings, after Sunday's games, Monday night and Thursday night, and the add counts refresh every few hours, so those are good times to look.`,
        ],
        list: [
          `Tuesday: read the adds and the recent form. Note who is trending because of a real role change and who is trending because of one big play.`,
          `Before your claims run: check your own injuries and bye weeks. Decide who you would drop for each claim, and make sure the swap helps your starting lineup, not just your bench.`,
          `Midweek: look again after the claims process. Players still available now were passed over by every other manager, which is information too.`,
          `Before kickoff on Sunday: check the inactive lists and fix your lineup. Waiver pickups are only useful if they play.`,
        ],
        closing: [
          `The goal of a routine is to stop paying for panic. Most of the people who regret a waiver claim made it in the hour after a player scored, when everyone else was making the same one.`,
        ],
      },
      {
        h2: 'How trade value works',
        paragraphs: [
          `The trade calculator values a player by his points per game above a waiver-level starter at his position, using the same replacement levels as the rankings. A star is far above replacement. An average starter is slightly above it. The calculator never lets a value fall below a small floor, because a starter always has some use.`,
          `The consequence is that two average players do not add up to a star. If one player is worth 8.0 above replacement and two others are worth 3.0 each, the star wins the trade by two points, even though the other side gives two players for one. The two average players also cost you a roster spot, because you have to drop someone to make room.`,
        ],
      },
      {
        h2: 'Rules of thumb',
        paragraphs: [
          `These hold up across formats.`,
        ],
        list: [
          `Trade depth for stars when you have bench spots to fill with replacement-level players. Do not do it when your bench is already thin.`,
          `Check the position before the name. Giving up a running back is cheap if you have three. It is not cheap if he is your only starter.`,
          `Ask what the other manager needs. A trade that fills a hole on their lineup is a trade they will accept. A trade that only helps you will be declined.`,
          `Do not trade a scarce position for a plentiful one unless the numbers favor you by a lot. Quarterbacks and tight ends are the usual traps.`,
          `Sell players after a spike and buy after a slump when the underlying role has not changed. Role is the stable part. Scoring is the noisy part.`,
        ],
        closing: [
          `Use the [trade calculator](/fantasy/trade) as a second opinion, not an oracle. It knows points and positions. It does not know that your opponent is desperate, that a player is about to be benched, or that your league has a rule we did not model.`,
        ],
      },
    ],
  },
];
