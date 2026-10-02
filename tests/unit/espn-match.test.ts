import { describe, expect, it } from 'vitest';
import { firstNamesCompatible, lastNameKey, pickEspnMatch, pickLeagueNamesake, pickSameTeamNamesake, positionFamily } from '@/lib/server/espn-match';

const PHI = 26, CAR = 5;
const wr = { id: '4241478', teamId: PHI, family: positionFamily('WR') };
const cb = { id: '5000001', teamId: CAR, family: positionFamily('CB') };

describe('ESPN roster matching', () => {
  it('keeps the Eagles receiver on PHI when a Panthers DB shares his name', () => {
    expect(pickEspnMatch({ position: 'WR', espnId: null }, [wr, cb])).toBe(wr);
    expect(pickEspnMatch({ position: 'WR', espnId: null }, [cb, wr])).toBe(wr);
  });
  it('fixes a player who was already matched to the wrong namesake', () => {
    expect(pickEspnMatch({ position: 'WR', espnId: cb.id }, [wr, cb])).toBe(wr);
  });
  it('treats EA and ESPN labels for the same job as a match', () => {
    expect(pickEspnMatch({ position: 'LE', espnId: null }, [{ id: '1', teamId: 1, family: positionFamily('DE') }])?.id).toBe('1');
    expect(pickEspnMatch({ position: 'ROLB', espnId: null }, [{ id: '2', teamId: 1, family: positionFamily('DE') }])?.id).toBe('2');
    expect(pickEspnMatch({ position: 'K', espnId: null }, [{ id: '3', teamId: 1, family: positionFamily('PK') }])?.id).toBe('3');
  });
  it('refuses to guess between two same-position namesakes without a known id', () => {
    const a = { id: 'a', teamId: 1, family: positionFamily('WR') }, b = { id: 'b', teamId: 2, family: positionFamily('WR') };
    expect(pickEspnMatch({ position: 'WR', espnId: null }, [a, b])).toBeNull();
    expect(pickEspnMatch({ position: 'WR', espnId: 'b' }, [a, b])).toBe(b);
  });
  it('never matches across positions', () => {
    expect(pickEspnMatch({ position: 'WR', espnId: null }, [cb])).toBeNull();
  });
  it('accepts a lone cross-position namesake only on the same team', () => {
    const jaxWr = { id: 'h', teamId: 15, family: positionFamily('WR') };
    expect(pickEspnMatch({ position: 'CB', espnId: null, teamId: 15 }, [jaxWr])).toBe(jaxWr);
    expect(pickEspnMatch({ position: 'CB', espnId: null, teamId: 3 }, [jaxWr])).toBeNull();
    expect(pickEspnMatch({ position: 'WR', espnId: null, teamId: PHI }, [cb])).toBeNull();
  });
  it('matches spelling differences by team and last name', () => {
    expect(lastNameKey('Ray-Ray McCloud III')).toBe('mccloud');
    expect(lastNameKey('Cameron Heyward')).toBe(lastNameKey('Cam Heyward'));
    const dt = { id: 'cam', teamId: 25, family: positionFamily('DT'), a: { fullName: 'Cameron Heyward' } };
    expect(pickSameTeamNamesake({ fullName: 'Cam Heyward', position: 'DT' }, [dt])).toBe(dt);
    expect(pickSameTeamNamesake({ fullName: 'Cam Heyward', position: 'WR' }, [dt])).toBeNull();
    expect(pickSameTeamNamesake({ fullName: 'Cam Heyward', position: 'DT' }, [dt, { ...dt, id: 'other' }])).toBeNull();
    const walker = { id: 'jw', teamId: 10, family: positionFamily('LB'), a: { fullName: 'Johnny Walker' } };
    expect(pickSameTeamNamesake({ fullName: 'Jalon Walker', position: 'LEDG' }, [walker])).toBeNull();
  });
  it('finds a released player league-wide by last name, position and a compatible first name', () => {
    const cam = { id: 'c', teamId: 25, family: positionFamily('DT'), a: { fullName: 'Cameron Heyward' } };
    const other = { id: 'o', teamId: 3, family: positionFamily('DT'), a: { fullName: 'Camden Heyward' } };
    const connor = { id: 'n', teamId: 3, family: positionFamily('DT'), a: { fullName: 'Connor Heyward' } };
    expect(pickLeagueNamesake({ fullName: 'Cam Heyward', position: 'DT' }, [cam, connor])).toBe(cam);
    expect(pickLeagueNamesake({ fullName: 'Cam Heyward', position: 'DT' }, [cam])).toBe(cam);
    expect(pickLeagueNamesake({ fullName: 'Cam Heyward', position: 'DT' }, [cam, other])).toBeNull();
    expect(pickLeagueNamesake({ fullName: 'Mike Heyward', position: 'DT' }, [cam])).toBeNull();
    expect(pickLeagueNamesake({ fullName: 'Cam Heyward', position: 'WR' }, [cam])).toBeNull();
  });
  it('only treats first names as the same person when they plausibly are', () => {
    for (const [a, b] of [['Cam', 'Cameron'], ['Josh', 'Joshua'], ['Andres', 'Andy'], ['Nathan', 'Nate'], ['JT', 'Jaylahn'], ['Jacob', 'Jake'], ['Marquise', 'Hollywood'], ['Chigoziem', 'Chig']]) {
      expect(firstNamesCompatible(`${a} X`, `${b} X`)).toBe(true);
    }
    for (const [a, b] of [['Jalon', 'Johnny'], ['Tyreek', 'Tyler'], ['Mike', 'Matt'], ['Jo', 'Jalen']]) {
      expect(firstNamesCompatible(`${a} X`, `${b} X`)).toBe(false);
    }
  });
});
