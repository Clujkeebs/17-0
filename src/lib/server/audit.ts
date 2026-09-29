import { db, schema } from '@/db';

export async function audit(actorId: string | null, action: string, targetType?: string, targetId?: string, metadata?: unknown) {
  try {
    await db.insert(schema.auditLog).values({ actorId, action, targetType, targetId, metadata: metadata as object });
  } catch (e) { console.error('[audit]', (e as Error).message); }
}
