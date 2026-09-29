/**
 * Deterministic attribute generator for seed players. The live ratings sync replaces these with
 * real per-attribute values; until then every player gets a plausible, position-shaped profile.
 *
 * Profile values are offsets from the player's overall. Keys not listed in a profile are "off-role"
 * and land in a low absolute band. After generation, the attributes used by the player's position
 * formula are nudged so ratePlayer() lands close to the overall.
 */
import { ATTRIBUTE_KEYS, positionGroup, type AttributeKey, type PositionGroup } from '../../src/lib/game/attributes';
import { DEFAULT_FORMULAS, formulaFor, ratePlayer } from '../../src/lib/game/formulas';
import { createRng } from '../../src/lib/game/prng';

type Profile = Partial<Record<AttributeKey, number>>;

const ATHLETE: Profile = { speed: -8, acceleration: -6, agility: -8, strength: -15, awareness: -2, stamina: -5, jumping: -12 };

const PROFILES: Record<PositionGroup, Profile> = {
  QB: {
    throwPower: 0, throwAccuracyShort: 3, throwAccuracyMid: 1, throwAccuracyDeep: -3, throwUnderPressure: -2,
    throwOnTheRun: -4, playAction: -1, awareness: 3, speed: -18, acceleration: -15, agility: -16,
    strength: -30, stamina: -8, jumping: -30, carrying: -25, bcVision: -25, jukeMove: -30, breakTackle: -35,
  },
  RB: {
    speed: 2, acceleration: 3, agility: 2, carrying: 2, breakTackle: 0, jukeMove: -2, trucking: -6, bcVision: 0,
    strength: -18, awareness: -6, stamina: -5, jumping: -10, catching: -14, routeRunning: -24, catchInTraffic: -22,
    release: -30, passBlock: -30, runBlock: -35,
  },
  WR: {
    catching: 2, routeRunning: 0, speed: 2, acceleration: 2, agility: 1, release: -2, catchInTraffic: -3,
    spectacularCatch: -3, awareness: -2, jumping: -4, stamina: -4, carrying: -18, bcVision: -18, jukeMove: -18,
    breakTackle: -30, strength: -28, runBlock: -40,
  },
  TE: {
    catching: -1, catchInTraffic: 0, runBlock: -3, passBlock: -12, speed: -10, acceleration: -8, agility: -14,
    routeRunning: -4, awareness: 0, strength: -10, release: -12, spectacularCatch: -15, stamina: -4, jumping: -12,
    breakTackle: -15, carrying: -18, trucking: -18,
  },
  OL: {
    runBlock: 2, passBlock: 2, strength: 3, awareness: 0, stamina: -6, speed: -38, acceleration: -26, agility: -32,
    jumping: -45, playRecognition: -30,
  },
  DL: {
    blockShedding: 2, powerMoves: 1, finesseMoves: -6, tackle: -2, pursuit: -6, playRecognition: -3, strength: 3,
    hitPower: -8, awareness: -3, speed: -22, acceleration: -14, agility: -22, stamina: -6, jumping: -30,
  },
  EDGE: {
    blockShedding: 0, powerMoves: -1, finesseMoves: 1, tackle: -3, pursuit: -2, playRecognition: -4, strength: -6,
    hitPower: -8, awareness: -3, speed: -8, acceleration: -4, agility: -10, stamina: -5, jumping: -18,
    zoneCoverage: -35, manCoverage: -40,
  },
  LB: {
    tackle: 2, pursuit: 1, playRecognition: 1, zoneCoverage: -4, manCoverage: -12, hitPower: 0, speed: -8,
    acceleration: -6, agility: -10, awareness: 1, blockShedding: -8, strength: -12, stamina: -4, jumping: -14,
    powerMoves: -25, finesseMoves: -25, press: -30,
  },
  CB: {
    manCoverage: 2, zoneCoverage: 0, speed: 3, acceleration: 3, agility: 2, playRecognition: -3, press: -5,
    awareness: -3, jumping: -2, stamina: -4, tackle: -24, hitPower: -30, pursuit: -14, catching: -28, strength: -38,
  },
  S: {
    zoneCoverage: 1, manCoverage: -5, playRecognition: 1, tackle: -2, hitPower: -3, speed: 0, acceleration: 0,
    agility: -4, awareness: 0, pursuit: -3, press: -22, jumping: -8, stamina: -4, catching: -25, strength: -28,
  },
  K: {
    kickPower: 1, kickAccuracy: 0, awareness: -25,
  },
};

const clampAttr = (v: number) => Math.max(20, Math.min(99, Math.round(v)));

export function generateAttributes(position: string, overall: number, name: string): Record<string, number> {
  const group = positionGroup(position);
  const rng = createRng(`attrs:${name}:${position}`);
  const profile = { ...ATHLETE, ...PROFILES[group] };
  const out: Record<string, number> = {};
  for (const key of ATTRIBUTE_KEYS) {
    const offset = profile[key];
    if (offset === undefined) {
      // Off-role attributes: low band, faintly tied to overall so stars look athletic.
      out[key] = clampAttr(22 + rng.int(0, 22) + (overall - 70) * 0.1);
    } else {
      out[key] = clampAttr(overall + offset + rng.int(-4, 4));
    }
  }
  if (group === 'K') {
    // Kickers are not athletes; everything except the kick stats stays low.
    for (const key of ATTRIBUTE_KEYS) if (key !== 'kickPower' && key !== 'kickAccuracy' && key !== 'awareness') out[key] = clampAttr(25 + rng.int(0, 25));
  }

  // Calibrate: shift the formula's inputs so the position formula rating tracks the overall.
  // OL are scored with the TE formula (catching heavy) by design, so we leave them uncalibrated.
  if (group !== 'OL') {
    const weights = DEFAULT_FORMULAS[formulaFor(group)];
    const keys = Object.keys(weights) as AttributeKey[];
    for (let i = 0; i < 6; i++) {
      const rating = ratePlayer(out, group);
      const delta = overall - rating;
      if (Math.abs(delta) < 1) break;
      for (const k of keys) out[k] = clampAttr((out[k] ?? 50) + delta);
    }
  }
  return out;
}
