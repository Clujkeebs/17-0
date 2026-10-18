import { describe, expect, it } from 'vitest';
import { nameKey, peopleOn, personKey } from '@/lib/game/person';

describe('who a player really is', () => {
  it('is the ESPN athlete id when a row has one, whatever franchise the row belongs to', () => {
    // A legend filed under two franchises is one person.
    expect(personKey({ espnId: 1428, name: 'Brett Favre' })).toBe(personKey({ espnId: '1428', name: 'Brett Favre' }));
    expect(personKey({ espnId: 1428, name: 'Brett Favre' })).toBe('e1428');
  });

  it('keeps two people who share a name apart, because their ids differ', () => {
    // The Bills quarterback and the Jaguars linebacker are both Josh Allen.
    expect(personKey({ espnId: 3918298, name: 'Josh Allen' })).not.toBe(personKey({ espnId: 4567048, name: 'Josh Allen' }));
  });

  it('falls back to the name, folded to letters, when there is no id', () => {
    expect(personKey({ name: "Ja'Marr Chase" })).toBe(personKey({ espnId: null, name: 'JaMarr Chase' }));
    expect(personKey({ espnId: '', name: 'José Ramírez' })).toBe(personKey({ name: 'jose ramirez' }));
    expect(nameKey('Amon-Ra St. Brown')).toBe('amonrastbrown');
  });

  it('treats a junk id as no id', () => {
    for (const bad of ['abc', 0, -4, NaN]) expect(personKey({ espnId: bad as never, name: 'Tom Brady' })).toBe(`n${nameKey('Tom Brady')}`);
  });

  it('keeps two unlisted players with one name apart when their positions differ', () => {
    expect(personKey({ name: 'Josh Allen', group: 'QB' })).not.toBe(personKey({ name: 'Josh Allen', group: 'EDGE' }));
    expect(personKey({ name: 'Josh Allen', group: 'QB' })).toBe(personKey({ name: 'Josh  Allen', group: 'QB' }));
    // With an id the position never matters.
    expect(personKey({ espnId: 7, name: 'A', group: 'QB' })).toBe(personKey({ espnId: 7, name: 'B', group: 'WR' }));
  });

  it('never mistakes an id for a name', () => {
    expect(personKey({ espnId: 123, name: 'x' })).not.toBe(personKey({ name: '123' }));
  });

  it('lists the people already on a roster, skipping picks made before keys existed', () => {
    const on = peopleOn([{ pid: 'e1' }, {}, { pid: 'n' + nameKey('Jerry Rice') }, { pid: undefined }]);
    expect([...on].sort()).toEqual(['e1', 'njerryrice']);
    expect(peopleOn([]).size).toBe(0);
  });
});
