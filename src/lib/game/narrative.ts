import { createRng } from './prng';

interface SlotLike { slot: string; name: string; grade: number }

const OPPONENTS = ['a top-five passing attack', 'a division rival', 'the defending champs', 'a blitz-heavy front', 'a run-first bully', 'a team on a six-game win streak', 'a rookie quarterback with nothing to lose', 'the league\'s best pass rush'];

const lastName = (n: string) => n.split(' ').slice(-1)[0];

export function buildNarrative(seed: string, slots: SlotLike[], wins: number, losses: number, diff: number): string[] {
  const rng = createRng(`story:${seed}`);
  const sorted = [...slots].sort((a, b) => b.grade - a.grade);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const wk = () => rng.int(2, 17);
  const opp = () => rng.pick(OPPONENTS);
  const label = (s: SlotLike) => ({
    QB: 'quarterback', RB: 'backfield', WR: 'receiver room', TE: 'tight end', DEF: 'defense', HC: 'sideline',
    OL: 'offensive line', EDGE: 'pass rush', DL: 'interior line', LB: 'linebacker corps', CB: 'secondary', S: 'secondary',
  } as Record<string, string>)[s.slot.replace(/\d+$/, '')] ?? s.slot;

  const opening = [
    `${lastName(best.name)} carried the load, and your ${label(best)} graded out as the best unit on the roster.`,
    `By Week ${wk()}, it was obvious the ${label(best)} was the reason this team scared people. ${lastName(best.name)} did not blink.`,
    `The plan started and ended with ${lastName(best.name)}, who posted a ${best.grade.toFixed(1)} grade and never let the offense stall.`,
    `Everything ran through the ${label(best)}. That is what a ${best.grade.toFixed(0)} rating buys you.`,
  ];
  const middle = [
    `The ${label(worst)} got exposed in Week ${wk()} against ${opp()}, and ${lastName(worst.name)} spent the flight home watching film.`,
    `In Week ${wk()}, ${opp()} found the weak spot: your ${label(worst)}. A ${worst.grade.toFixed(1)} grade does not hide for long.`,
    `Midseason, ${lastName(worst.name)} became the answer to every opposing coordinator's question. Week ${wk()} against ${opp()} was ugly.`,
  ];
  let closing: string;
  const rec = `${wins}-${losses}`;
  const pd = `${diff >= 0 ? '+' : ''}${diff}`;
  if (wins === 17) closing = `17-0. Seventeen games, zero losses, point differential of ${pd}. Perfect.`;
  else if (wins >= 13) closing = rng.pick([`You finished ${rec} with a point differential of ${pd} and the top seed in sight.`, `A ${rec} finish and a ${pd} point differential. Not perfect, but January will be fun.`]);
  else if (wins >= 10) closing = rng.pick([`A late surge against divisional opponents pushed you into the wild card at ${rec}, point differential ${pd}.`, `You closed ${rec} with a ${pd} differential. Wild card weekend, on the road.`]);
  else if (wins >= 7) closing = rng.pick([`${rec}. Point differential ${pd}. The kind of season that gets a coordinator fired.`, `You finished ${rec} with a ${pd} point differential and a lot of questions.`]);
  else closing = rng.pick([`${rec} and a ${pd} differential. At least the draft pick will be high.`, `The season ended ${rec}, point differential ${pd}. Start over.`]);
  return [rng.pick(opening), rng.pick(middle), closing];
}
