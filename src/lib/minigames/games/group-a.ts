import type { MiniGame } from '../types';
import { higherLower } from './higher-lower';
import { grid } from './grid';
import { mysteryPlayer } from './mystery-player';
import { wheresHeFrom } from './wheres-he-from';

 
export const groupA: MiniGame<any, any>[] = [higherLower, grid, mysteryPlayer, wheresHeFrom];
