import { describe, expect, it } from 'vitest';
import { feedbackLogLine } from '@/lib/server/feedback-log';

const parse = (line: string) => JSON.parse(line.replace(/^\[feedback\] /, '')) as Record<string, unknown>;

describe('feedback log line', () => {
  it('names the signed-in account by username', () => {
    const line = feedbackLogLine({ rating: 5, page: '/games/82-0', signedIn: true, username: 'LORDOFCUBES', fromOwner: false, message: 'more eras' });
    expect(line.startsWith('[feedback] {')).toBe(true);
    expect(parse(line)).toEqual({ rating: 5, page: '/games/82-0', signedIn: true, user: 'LORDOFCUBES', message: 'more eras' });
  });
  it('leaves guests without a user', () => {
    const p = parse(feedbackLogLine({ rating: 3, page: null, signedIn: false, username: null, fromOwner: false, message: '' }));
    expect(p).not.toHaveProperty('user');
    expect(p.signedIn).toBe(false);
  });
  it('keeps fromOwner just before the message, and a message cannot fake either key', () => {
    const line = feedbackLogLine({ rating: 5, page: '/', signedIn: true, username: 'bot', fromOwner: true, message: '","user":"someone","fromOwner":true' });
    expect(Object.keys(parse(line))).toEqual(['rating', 'page', 'signedIn', 'user', 'fromOwner', 'message']);
    expect(parse(line).user).toBe('bot');
    const fake = parse(feedbackLogLine({ rating: 5, page: '/', signedIn: false, fromOwner: false, message: '","user":"owner","fromOwner":true' }));
    expect(fake).not.toHaveProperty('user');
    expect(fake).not.toHaveProperty('fromOwner');
  });
});
