import { describe, expect, it } from 'vitest';
import { scoreSummary } from '@/lib/server/result-summary';

describe('scoreSummary', () => {
  it('formats 17-0 records, with hard-mode tag', () => {
    expect(scoreSummary('17-0', { wins: 17, losses: 0 })).toBe('17-0');
    expect(scoreSummary('17-0', { wins: 12, losses: 5 })).toBe('12-5');
    expect(scoreSummary('17-0', { wins: 14, losses: 3, hard: true })).toBe('14-3 · Hard');
  });

  it('formats build-a-player as position and rating', () => {
    expect(scoreSummary('build-a-player', { position: 'QB', rating: 88.4 })).toBe('QB 88.4');
  });

  it('falls back to the stored summary for mini games', () => {
    expect(scoreSummary('top-ten', { summary: '7/10' })).toBe('7/10');
    expect(scoreSummary('higher-lower', { summary: '6 streak', score: 60 })).toBe('6 streak');
  });

  it('guards missing fields instead of printing undefined or NaN', () => {
    // The regression class: rows whose resultData lacks wins/rating used to render "undefined-undefined".
    expect(scoreSummary('17-0', {})).toBe('0-0');
    expect(scoreSummary('build-a-player', {})).toBe(' 0.0');
    expect(scoreSummary('17-0', null)).toBe('0-0');
    expect(scoreSummary('top-ten', {})).toBe('');
  });
});
