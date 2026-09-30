/** Result tiers for the end-of-game banner. Shared by server pages and the client banner. */
export interface Tier { key: string; title: string; line: string; confetti?: boolean }

export function seasonTier(wins: number): Tier {
  if (wins >= 17) return { key: 'perfect', title: 'Perfect season.', line: 'Seventeen up, seventeen down. Only the 1972 Dolphins know this feeling. Screenshot it.', confetti: true };
  if (wins === 16) return { key: 'close', title: 'So close.', line: 'One loss from perfection. Somewhere a kicker is staring at the ground.' };
  if (wins >= 14) return { key: 'contender', title: 'Contender.', line: 'Top seed energy. Home field through January.' };
  if (wins >= 11) return { key: 'playoffs', title: 'Playoff team.', line: 'You are in. Now win on the road.' };
  if (wins >= 8) return { key: 'bubble', title: 'On the bubble.', line: 'Week 18 scoreboard watching. Not ideal.' };
  return { key: 'rebuild', title: 'Rebuild.', line: 'At least the draft pick will be high. Spin again.' };
}

export function buildTier(rating: number): Tier {
  if (rating >= 95) return { key: 'perfect', title: 'Generational.', line: 'A 95-plus build. Front offices would trade a future first for this.', confetti: true };
  if (rating >= 90) return { key: 'close', title: 'Elite.', line: 'Pro Bowl lock. A couple of traits from legendary.' };
  if (rating >= 80) return { key: 'contender', title: 'Starter.', line: 'Every team in the league starts this guy.' };
  return { key: 'rebuild', title: 'Depth piece.', line: 'Special teams hero. Try another build.' };
}

