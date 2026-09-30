import type { Attributes, PositionGroup } from '@/lib/game/attributes';

export interface GPlayer {
  id: string; name: string; slug: string; position: string; group: PositionGroup; ovr: number;
  teamId: number; team: string; teamName: string; teamColor: string; logoUrl: string | null;
  conference: string; division: string;
  college: string | null; age: number | null; yearsPro: number | null; heightInches: number | null; weightLbs: number | null;
  jersey: number | null; archetype: string | null; img: string | null; attrs: Attributes;
}
export interface GTeam { id: number; abbr: string; name: string; city: string; color: string; logoUrl: string | null; conference: string; division: string }
export interface GameData { players: GPlayer[]; teams: GTeam[] }

export interface ScoreResult {
  /** Leaderboard score: higher is better. */
  score: number;
  /** Short text for leaderboards and share cards, e.g. "7/9" or "4 guesses". */
  summary: string;
  /** Anything the result screen needs (per-question correctness, the answers). */
  detail: unknown;
  perfect?: boolean;
}

export interface MiniGame<Puzzle = unknown, Answer = unknown> {
  slug: string;
  name: string;
  tagline: string;
  howTo: string[];
  /** Deterministic from the seed. Includes secrets; never sent to the client as-is. */
  generate(seed: string, data: GameData): Puzzle;
  /** What the client is allowed to see before answering. */
  publicView(p: Puzzle): unknown;
  score(p: Puzzle, answer: Answer): ScoreResult;
  /**
   * Optional per-step feedback for guess games (e.g. "right team, older, higher OVR").
   * Must not reveal the full answer. Not saved; the final score is recomputed from the submitted answer.
   */
  check?(p: Puzzle, guess: unknown, data: GameData): unknown;
}
