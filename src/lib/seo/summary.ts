import { ATTRIBUTE_LABELS, POSITION_NAMES, type AttributeKey, type PositionGroup } from '@/lib/game/attributes';
import { GROUP_PLURAL } from './positions';
import { lastWord, ordinal, possessive, rankPhrase, strHash } from './text';

export interface SummaryInput {
  slug: string;
  fullName: string;
  group: PositionGroup;
  ovr: number;
  ovrRank: number;
  groupSize: number;
  team?: string | null;
  topAttr?: { key: AttributeKey; value: number; rank: number; total: number } | null;
  weakAttr?: { key: AttributeKey; value: number } | null;
  formulaGrade: number;
  age?: number | null;
  yearsPro?: number | null;
}

/**
 * Three-sentence player summary. The opening sentence rotates through several templates chosen by a
 * hash of the slug, so pages do not all start with the player's name.
 */
export function playerSummary(s: SummaryInput): string {
  const h = strHash(`summary:${s.slug}`);
  const last = lastWord(s.fullName);
  const plural = GROUP_PLURAL[s.group];
  const posName = POSITION_NAMES[s.group].toLowerCase();
  const ovrPhrase = rankPhrase(s.ovrRank, s.groupSize, plural);
  const top = s.topAttr;
  const topLabel = top ? ATTRIBUTE_LABELS[top.key].toLowerCase() : null;
  const topPhrase = top ? rankPhrase(top.rank, top.total, plural) : null;
  const teamBit = s.team ? `the ${s.team}` : 'a team still to be announced';

  const openers: string[] = [
    top ? `At ${top.value}, ${possessive(last)} ${topLabel} is ${topPhrase}.` : `A ${s.ovr} overall puts ${last} ${ovrPhrase}.`,
    `${s.ovr} overall. That is ${ovrPhrase}, and it makes ${s.fullName} one of the names that matters for ${teamBit}.`,
    `Ranked ${ordinal(s.ovrRank)} of ${s.groupSize || 1} ${plural} by overall, ${s.fullName} carries a ${s.ovr} into this season for ${teamBit}.`,
    top ? `${capitalize(topLabel!)} is the calling card: a ${top.value} that sits ${topPhrase}.` : `Among ${plural}, a ${s.ovr} overall puts ${s.fullName} ${ovrPhrase.replace(/ among .*$/, '')}.`,
    `For ${teamBit}, the ${posName} spot belongs to ${s.fullName}, a ${s.ovr} overall who ranks ${ordinal(s.ovrRank)} at the position.`,
  ];

  const gradeGap = Math.round((s.formulaGrade - s.ovr) * 10) / 10;
  const middles: string[] = [
    `Run through the site's ${s.group} formula, ${last} grades ${s.formulaGrade.toFixed(1)}, ${gradeGap >= 0 ? `${gradeGap.toFixed(1)} above` : `${Math.abs(gradeGap).toFixed(1)} below`} the headline overall.`,
    `The 17-0 formula, which weights only the attributes that decide the position, scores ${last} at ${s.formulaGrade.toFixed(1)}.`,
    `Strip it down to the weighted inputs and the grade is ${s.formulaGrade.toFixed(1)}, which is the number that counts in 17-0.`,
  ];

  const weak = s.weakAttr;
  const closers: string[] = [
    weak ? `The soft spot is ${ATTRIBUTE_LABELS[weak.key].toLowerCase()} at ${weak.value}, the lowest of the attributes that feed the grade.` : `No weighted attribute falls below the rest by much.`,
    weak ? `If there is a hole, it is ${ATTRIBUTE_LABELS[weak.key].toLowerCase()} (${weak.value}), and opposing coordinators will find it.` : `There is no obvious hole in the profile.`,
    s.yearsPro != null && s.age ? `${s.age} years old with ${s.yearsPro} ${s.yearsPro === 1 ? 'season' : 'seasons'} of experience, the profile is ${s.age <= 26 ? 'still trending up' : s.age >= 31 ? 'closer to the end than the start' : 'in its prime window'}.`
      : weak ? `The lowest weighted input is ${ATTRIBUTE_LABELS[weak.key].toLowerCase()} at ${weak.value}.` : `The profile is even across the board.`,
  ];

  return [openers[h % openers.length], middles[(h >>> 4) % middles.length], closers[(h >>> 8) % closers.length]].join(' ');
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
