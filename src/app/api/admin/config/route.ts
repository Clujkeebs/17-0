export const runtime = 'nodejs';

import { and, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdmin } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json } from '@/lib/server/request';
import { getFormulas, getSlotWeights } from '@/lib/server/config';
import { audit } from '@/lib/server/audit';
import { DEFAULT_FORMULAS } from '@/lib/game/formulas';
import { SLOT_WEIGHTS } from '@/lib/game/seventeen';
import { ATTRIBUTE_KEYS } from '@/lib/game/attributes';

const weight = z.number().finite().min(0).max(1);
const FORMULA_KEYS = Object.keys(DEFAULT_FORMULAS) as [string, ...string[]];
const SLOT_KEYS = Object.keys(SLOT_WEIGHTS) as [string, ...string[]];

const FormulasSchema = z.record(z.enum(FORMULA_KEYS), z.partialRecord(z.enum(ATTRIBUTE_KEYS as [string, ...string[]]), weight))
  .refine((v) => FORMULA_KEYS.every((k) => k in v), { message: `Formulas must include ${FORMULA_KEYS.join(', ')}.` });
const SlotWeightsSchema = z.record(z.enum(SLOT_KEYS), weight)
  .refine((v) => SLOT_KEYS.every((k) => k in v), { message: `Slot weights must include ${SLOT_KEYS.join(', ')}.` });

const EDITABLE = {
  'global/formulas': FormulasSchema,
  '17-0/slot_weights': SlotWeightsSchema,
} as const;
type EditableKey = keyof typeof EDITABLE;

const Body = z.object({ gameType: z.string(), configKey: z.string(), value: z.unknown() });

export async function GET() {
  if (!(await requireAdmin())) return errorJson(404, 'Not found');
  const [formulas, slotWeights, history] = await Promise.all([
    getFormulas(), getSlotWeights(),
    db.select({ id: schema.gameConfigs.id, gameType: schema.gameConfigs.gameType, configKey: schema.gameConfigs.configKey, version: schema.gameConfigs.version, updatedAt: schema.gameConfigs.updatedAt, updatedBy: schema.gameConfigs.updatedBy })
      .from(schema.gameConfigs).orderBy(desc(schema.gameConfigs.updatedAt)).limit(50),
  ]);
  return json({ formulas, slotWeights, history });
}

export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Expected { gameType, configKey, value }.');
  const key = `${parsed.data.gameType}/${parsed.data.configKey}` as EditableKey;
  if (!(key in EDITABLE)) return errorJson(400, `Not an editable config: ${key}`);
  const v = EDITABLE[key].safeParse(parsed.data.value);
  if (!v.success) return errorJson(400, v.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).slice(0, 5).join('; '));

  const { gameType, configKey } = parsed.data;
  const row = await db.transaction(async (tx) => {
    const [cur] = await tx.select({ v: max(schema.gameConfigs.version) }).from(schema.gameConfigs)
      .where(and(eq(schema.gameConfigs.gameType, gameType), eq(schema.gameConfigs.configKey, configKey)));
    const [inserted] = await tx.insert(schema.gameConfigs).values({
      gameType, configKey, configValue: v.data, version: (cur?.v ?? 0) + 1, updatedBy: s.user.email ?? s.user.id,
    }).returning();
    return inserted;
  });
  await audit(s.user.id, 'config.updated', 'game_config', key, { version: row.version });
  return json({ ok: true, version: row.version });
}
