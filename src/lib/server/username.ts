import { Filter } from 'bad-words';

// Pure username validation. No DB access here so it stays unit-testable;
// availability checks live in account.ts.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RE = /^[A-Za-z0-9_]+$/;

export const USERNAME_MESSAGES = {
  required: 'Pick a username. Three to twenty characters.',
  tooShort: 'Too short. Three characters minimum.',
  tooLong: 'Too long. Twenty characters max, it has to fit on the back of a jersey.',
  charset: 'Keep it to letters, numbers, and underscores.',
  profane: 'Pick something your mom could read on a jumbotron.',
  reserved: 'That one is reserved. Pick something that is actually yours.',
  taken: "That one's taken.",
} as const;

export type UsernameError = keyof typeof USERNAME_MESSAGES;
export type UsernameResult = { ok: true; username: string } | { ok: false; code: UsernameError; error: string };

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', $: 's', '@': 'a' };

/** Lowercase and undo common leetspeak substitutions. */
export function normalizeLeet(s: string): string {
  return s.toLowerCase().replace(/[013457$@]/g, (c) => LEET[c] ?? c);
}

/** Reserved names: blocked anywhere in the (normalized) username. */
const RESERVED = ['admin', 'moderator', 'unbeaten', 'official'];

/**
 * Strong terms blocked as substrings (after normalization and dropping separators).
 * Kept to stems that do not appear inside ordinary words or football names
 * (so no "ass", "dick", "cock", "rape": think Bass, Dickerson, Peacock, Grapes).
 */
const SUBSTRING_BLOCK = [
  'fuck', 'shit', 'cunt', 'nigg', 'nigr', 'fagg', 'faggot', 'bitch', 'whore', 'slut', 'nazi', 'hitler', 'kike',
  'retard', 'tranny', 'pussy', 'porn', 'penis', 'vagina', 'twat', 'wank', 'jizz', 'cumshot', 'dildo', 'rapist',
  'molest', 'pedophil', 'chingchong', 'wetback', 'beaner', 'raghead', 'towelhead', 'sandnigg', 'gook', 'spick',
];

/** Additional whole-token terms (slurs and abuse) on top of the bad-words list. */
const TOKEN_BLOCK = [
  'fag', 'spic', 'chink', 'coon', 'dyke', 'homo', 'gypsy', 'jap', 'kkk', 'rape', 'raped', 'raping', 'cum', 'ass', 'dick',
  'cock', 'tits', 'nsfw', 'hoe', 'hoes', 'heil', 'isis',
];

let filter: Filter | null = null;
function getFilter(): Filter {
  if (!filter) {
    filter = new Filter();
    filter.addWords(...TOKEN_BLOCK);
    filter.removeWords('hell', 'damn', 'crap', 'god');
  }
  return filter;
}

/** True if the username reads as profane or slur-adjacent in any common spelling. */
export function isProfaneUsername(name: string): boolean {
  const norm = normalizeLeet(name);
  const collapsed = norm.replace(/[^a-z]/g, '');
  if (SUBSTRING_BLOCK.some((w) => collapsed.includes(w))) return true;
  const f = getFilter();
  // Split on underscores and on letter/digit boundaries in the raw name, then check each piece normalized.
  const pieces = name.split(/_+/).flatMap((p) => p.split(/(?<=[a-z])(?=[A-Z])/)).map(normalizeLeet).filter(Boolean);
  const candidates = new Set([norm, collapsed, norm.replace(/_/g, ' '), ...pieces]);
  for (const c of candidates) if (f.isProfane(c)) return true;
  return false;
}

export function isReservedUsername(name: string): boolean {
  const collapsed = normalizeLeet(name).replace(/[^a-z]/g, '');
  return RESERVED.some((r) => collapsed.includes(r));
}

const fail = (code: UsernameError): UsernameResult => ({ ok: false, code, error: USERNAME_MESSAGES[code] });

/** Validate shape, charset, reserved words and profanity. Does not check availability. */
export function validateUsername(raw: unknown): UsernameResult {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return fail('required');
  if (!USERNAME_RE.test(name)) return fail('charset');
  if (name.length < USERNAME_MIN) return fail('tooShort');
  if (name.length > USERNAME_MAX) return fail('tooLong');
  if (isReservedUsername(name)) return fail('reserved');
  if (isProfaneUsername(name)) return fail('profane');
  return { ok: true, username: name };
}
