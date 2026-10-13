import type { GameData, MiniGame } from '../types';
import { BOWL_DRIVES, DRIVE_POINTS, bowlMatchup, bowlScore, bowlTeams, oppDrives, type BowlTeam } from '@/lib/game/bowl';

/**
 * Unbeaten Bowl as a ranked mini: Today is one matchup for everyone (team and opponent from the date); Casual
 * lets you pick any team. You play your drives; the opponent's are simulated from both rosters, the same way
 * on the server, so they cannot be changed by the client. The client reports the points of each of its drives.
 */
interface Puzzle { seed: string; today: boolean; teams: BowlTeam[] }
interface Answer { team: string; drives: number[] }

export const unbeatenBowl: MiniGame<Puzzle, Answer, GameData> = {
  slug: 'unbeaten-bowl',
  name: 'Unbeaten Bowl',
  tagline: 'Retro football on real NFL rosters. Play the daily match, a quick game, or run a franchise as GM.',
  howTo: [
    'Pick a team (Today, everyone plays the same matchup). You get six drives; the other team gets six, played out from the real rosters.',
    'Before the snap, pick one of the three plays, or open the playbook: over forty pass plays (quick game, mid range, deep shots, screens, play action) and six runs.',
    'On a pass, tap a receiver to throw to him; the ball leads him. Green rings are open, red are covered. Or pull back and let go: the throw locks onto whoever you point at. Throw before the rush gets home.',
    'With the ball, steer by holding above or below your runner (or the arrow keys) and tap him (or Space) to juke past a tackler.',
    'Fourth down: go for it, punt, or kick a field goal by tapping when the marker is in the green. Ratings matter: arm, accuracy, speed, hands, blocking, the pass rush, coverage and your kicker\'s leg.',
    'Short on time? Quick sim plays your drives for you from the ratings, from the kickoff card or any play call. Playing is always worth a little more.',
    'GM mode: take over a team and play season after season. Win credits to train players, upgrade facilities and hire coordinators; handle the press, injuries, contracts and the cap; draft rookies, sign free agents and chase the Unbeaten Bowl.',
  ],
  generate(seed, data) {
    const teams = bowlTeams(data.teams.map((t) => ({ id: t.id, abbr: t.abbr, name: t.name, city: t.city, color: t.color, logoUrl: t.logoUrl })),
      data.players.map((p) => ({ name: p.name, position: p.position, group: p.group, ovr: p.ovr, teamId: p.teamId, jersey: p.jersey, attrs: p.attrs as Record<string, number | undefined> })));
    if (teams.length < 8) throw new Error('Rosters are still loading. Try again in a few minutes.');
    return { seed, today: seed.startsWith('mini:'), teams };
  },
  publicView: (p) => ({ seed: p.seed, today: p.today, teams: p.teams, fixed: p.today ? bowlMatchup(p.seed, p.teams).you.abbr : null, drives: BOWL_DRIVES }),
  /** Today: each finished drive is recorded as you play, so a reload cannot replay a bad drive. */
  check(p, guess) {
    const g = guess as { drive?: unknown; points?: unknown };
    if (!Number.isInteger(g?.drive) || (g.drive as number) < 0 || (g.drive as number) >= BOWL_DRIVES || !(DRIVE_POINTS as readonly number[]).includes(g.points as number)) throw new Error('Invalid drive.');
    return { ok: true };
  },
  maxChecks: BOWL_DRIVES * 2,
  applyChecks(answer, checks) {
    const drives = [...(answer?.drives ?? [])];
    const seen = new Set<number>();
    for (const c of checks as { drive: number; points: number }[]) {
      if (seen.has(c.drive)) continue;
      seen.add(c.drive);
      drives[c.drive] = c.points;
    }
    return { ...answer, drives };
  },
  score(p, answer) {
    if (!answer || typeof answer.team !== 'string' || !Array.isArray(answer.drives) || answer.drives.length !== BOWL_DRIVES) throw new Error('Finish all six drives.');
    if (!answer.drives.every((d) => (DRIVE_POINTS as readonly number[]).includes(d))) throw new Error('Invalid drive result.');
    const { you, opp } = bowlMatchup(p.seed, p.teams, p.today ? undefined : answer.team);
    if (you.abbr !== answer.team) throw new Error("That is not today's team.");
    const theirs = oppDrives(p.seed, you, opp);
    const pf = answer.drives.reduce((s, d) => s + d, 0), pa = theirs.reduce((s, d) => s + d.points, 0);
    const result = pf > pa ? 'W' : pf < pa ? 'L' : 'T';
    return {
      score: bowlScore(pf, pa),
      summary: `${result} ${pf}-${pa} ${you.abbr} vs ${opp.abbr}`,
      detail: { you: you.abbr, opp: opp.abbr, youName: `${you.city} ${you.name}`, oppName: `${opp.city} ${opp.name}`, pf, pa, drives: answer.drives, theirs: theirs.map((d) => d.points) },
      // Perfect: a touchdown on every drive and a win.
      perfect: pf > pa && answer.drives.every((d) => d >= 6),
    };
  },
};
