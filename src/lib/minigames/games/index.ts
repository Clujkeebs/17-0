import type { MiniGame } from '../types';
import { groupA } from './group-a';
import { groupB } from './group-b';
import { groupC } from './group-c';

/** Registered mini games, in hub order. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: MiniGame<any, any>[] = [...groupA, ...groupB, ...groupC];
