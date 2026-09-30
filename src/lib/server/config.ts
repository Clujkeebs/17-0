import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { DEFAULT_FORMULAS, type FormulaKey, type Weights } from '@/lib/game/formulas';
import { SLOTS, SLOT_WEIGHTS, type Slot } from '@/lib/game/seventeen';

/** Latest version of a config key, falling back to code defaults. */
export async function getConfig<T>(gameType: string, key: string, fallback: T): Promise<T> {
  try {
    const [row] = await db.select().from(schema.gameConfigs)
      .where(and(eq(schema.gameConfigs.gameType, gameType), eq(schema.gameConfigs.configKey, key)))
      .orderBy(desc(schema.gameConfigs.version)).limit(1);
    return row ? (row.configValue as T) : fallback;
  } catch { return fallback; }
}

export const getFormulas = () => getConfig<Record<FormulaKey, Weights>>('global', 'formulas', DEFAULT_FORMULAS);
/** Stored weights from an older slot layout are ignored so a format change never breaks grading. */
export const getSlotWeights = async () => {
  const w = await getConfig<Record<string, number>>('17-0', 'slot_weights', SLOT_WEIGHTS);
  return SLOTS.every((k) => typeof w[k] === 'number') ? (w as Record<Slot, number>) : SLOT_WEIGHTS;
};
