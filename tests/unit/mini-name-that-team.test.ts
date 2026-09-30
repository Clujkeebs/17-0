import { describe, expect, it } from 'vitest';
import { nameThatTeam } from '@/lib/minigames/games/name-that-team';
import { fixture } from './_gc-fixture';

const data = fixture();
describe('name-that-team', () => {
  it('is deterministic with six clues', () => {
    const p = nameThatTeam.generate('a', data);
    expect(p).toEqual(nameThatTeam.generate('a', data));
    expect(p.clues).toHaveLength(6);
    expect(JSON.stringify(nameThatTeam.publicView(p))).not.toContain(p.clues[5]);
  });
  it('scores by clues used', () => {
    const p = nameThatTeam.generate('b', data);
    const wrong = data.teams.filter((t) => t.id !== p.team.id).map((t) => t.id);
    expect(nameThatTeam.score(p, [p.team.id])).toMatchObject({ score: 6, perfect: true });
    expect(nameThatTeam.score(p, [wrong[0], wrong[1], p.team.id]).score).toBe(4);
    expect(nameThatTeam.score(p, wrong).score).toBe(0);
    expect(nameThatTeam.check!(p, { guesses: [wrong[0]] }, data)).toMatchObject({ correct: false, done: false });
    expect(() => nameThatTeam.score(p, [])).toThrow();
  });
});
