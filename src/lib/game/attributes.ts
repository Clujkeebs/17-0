export const ATTRIBUTE_LABELS = {
  speed: 'Speed', acceleration: 'Acceleration', agility: 'Agility', strength: 'Strength', awareness: 'Awareness',
  stamina: 'Stamina', jumping: 'Jumping',
  throwPower: 'Throw Power', throwAccuracyShort: 'Short Accuracy', throwAccuracyMid: 'Mid Accuracy',
  throwAccuracyDeep: 'Deep Accuracy', throwUnderPressure: 'Throw Under Pressure', throwOnTheRun: 'Throw on the Run',
  playAction: 'Play Action',
  carrying: 'Carrying', breakTackle: 'Break Tackle', jukeMove: 'Juke Move', trucking: 'Trucking', bcVision: 'Ball Carrier Vision',
  catching: 'Catching', catchInTraffic: 'Catch in Traffic', spectacularCatch: 'Spectacular Catch',
  routeRunning: 'Route Running', release: 'Release',
  runBlock: 'Run Block', passBlock: 'Pass Block',
  tackle: 'Tackle', hitPower: 'Hit Power', pursuit: 'Pursuit', playRecognition: 'Play Recognition',
  blockShedding: 'Block Shedding', powerMoves: 'Power Moves', finesseMoves: 'Finesse Moves',
  manCoverage: 'Man Coverage', zoneCoverage: 'Zone Coverage', press: 'Press',
  kickPower: 'Kick Power', kickAccuracy: 'Kick Accuracy',
} as const;

export type AttributeKey = keyof typeof ATTRIBUTE_LABELS;
export type Attributes = Partial<Record<AttributeKey, number>>;
export const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTE_LABELS) as AttributeKey[];

/** Site-level position groups. Raw positions from the ratings feed map into these. */
export const POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K'] as const;
export type PositionGroup = (typeof POSITION_GROUPS)[number];

const RAW_TO_GROUP: Record<string, PositionGroup> = {
  QB: 'QB', HB: 'RB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE',
  LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL', OL: 'OL', T: 'OL', G: 'OL',
  DT: 'DL', NT: 'DL', DL: 'DL', LE: 'EDGE', RE: 'EDGE', DE: 'EDGE', EDGE: 'EDGE', LEDG: 'EDGE', REDG: 'EDGE',
  LOLB: 'LB', ROLB: 'LB', MLB: 'LB', OLB: 'LB', ILB: 'LB', SAM: 'LB', WILL: 'LB', MIKE: 'LB', LB: 'LB',
  CB: 'CB', FS: 'S', SS: 'S', S: 'S', K: 'K', P: 'K',
};

export function positionGroup(raw: string): PositionGroup {
  return RAW_TO_GROUP[raw.toUpperCase()] ?? 'OL';
}

export const POSITION_NAMES: Record<PositionGroup, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', OL: 'Offensive Line',
  DL: 'Defensive Tackle', EDGE: 'Edge Rusher', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker',
};
