/** A player as normalized from the ratings feed, before team resolution. */
export interface FeedPlayer {
  maddenId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  slug: string;
  position: string;
  teamLabel: string | null;
  overallRating: number;
  attributes: Record<string, number>;
  archetype: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  college: string | null;
  jerseyNumber: number | null;
  age: number | null;
  yearsPro: number | null;
  imageUrl: string | null;
}

/** The subset of an existing players row the diff needs. */
export interface ExistingPlayer {
  id: string;
  maddenId: string;
  slug: string;
  overallRating: number;
  attributes: Record<string, number>;
  maddenVersion: string;
  isActive: boolean;
  isAllTimeGreat: boolean;
}

export interface PlayerChange {
  incoming: FeedPlayer;
  existing: ExistingPlayer;
  ovrDelta: number;
  attributesChanged: boolean;
}

export interface PlayerDiff {
  added: FeedPlayer[];
  changed: PlayerChange[];
  unchanged: { incoming: FeedPlayer; existing: ExistingPlayer }[];
  /** Active, non-legend rows with no counterpart in the feed. They get is_active=false, never deleted. */
  missing: ExistingPlayer[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Players whose OVR dropped by more than the threshold vs the previous rating. */
  flaggedDrops: { maddenId: string; fullName: string; from: number; to: number }[];
}

export interface SyncSummary {
  ok: boolean;
  dryRun: boolean;
  snapshotId: number | null;
  sourceUrl: string;
  parsed: number;
  added: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  historyRows: number;
  unresolvedTeams: string[];
  errors: string[];
  warnings: string[];
  durationMs: number;
}
