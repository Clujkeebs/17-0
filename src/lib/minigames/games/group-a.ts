import type { MiniGame } from '../types';
import { higherLower } from './higher-lower';
import { grid } from './grid';
import { mysteryPlayer } from './mystery-player';
import { wheresHeFrom } from './wheres-he-from';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const groupA: MiniGame<any, any>[] = [higherLower, grid, mysteryPlayer, wheresHeFrom];
