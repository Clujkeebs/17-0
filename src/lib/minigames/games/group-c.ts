import type { MiniGame } from '../types';
import { topTen } from './top-ten';
import { rankEm } from './rank-em';
import { nameThatTeam } from './name-that-team';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const groupC: MiniGame<any, any>[] = [topTen, rankEm, nameThatTeam];
