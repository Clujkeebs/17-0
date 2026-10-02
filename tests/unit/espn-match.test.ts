import { describe, expect, it } from 'vitest';
import { pickEspnMatch, positionFamily } from '@/lib/server/espn-match';

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
});
