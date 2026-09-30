import type { MiniGame } from '../types';
import { groupA } from './group-a';
import { groupB } from './group-b';
import { groupC } from './group-c';
import { groupD } from './group-d';

/** Registered mini games, in hub order. */
 
export const games: MiniGame<any, any>[] = [...groupA, ...groupB, ...groupC, ...groupD];
