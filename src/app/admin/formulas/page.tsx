import type { Metadata } from 'next';
import { desc, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getFormulas, getSlotWeights } from '@/lib/server/config';
import { ConfigEditor } from '../AdminClient';
import { fmtTime } from '../fmt';

export const metadata: Metadata = { title: 'Formulas', description: 'Edit rating formulas and slot weights.', alternates: { canonical: '/admin/formulas' } };

export default async function FormulasPage() {
  const [formulas, slotWeights, history] = await Promise.all([
    getFormulas(), getSlotWeights(),
    db.select({ id: schema.gameConfigs.id, gameType: schema.gameConfigs.gameType, configKey: schema.gameConfigs.configKey, version: schema.gameConfigs.version, updatedAt: schema.gameConfigs.updatedAt, updatedBy: schema.gameConfigs.updatedBy })
      .from(schema.gameConfigs).where(inArray(schema.gameConfigs.configKey, ['formulas', 'slot_weights']))
      .orderBy(desc(schema.gameConfigs.updatedAt)).limit(50),
  ]);

  return (
    <div className="container section">
      <span className="eyebrow">Admin</span>
      <h1>Formulas</h1>
      <p className="muted">Weights are relative within each formula; they do not need to sum to 1. Changes apply to new runs immediately.</p>

      <section aria-labelledby="slot-h" className="card" style={{ marginTop: 24 }}>
        <h2 id="slot-h">17-0 slot weights</h2>
        <ConfigEditor gameType="17-0" configKey="slot_weights" label="17-0 / slot_weights (JSON)" initial={slotWeights} depth={1} />
      </section>

      <section aria-labelledby="formula-h" className="card" style={{ marginTop: 24 }}>
        <h2 id="formula-h">Position formulas</h2>
        <ConfigEditor gameType="global" configKey="formulas" label="global / formulas (JSON)" initial={formulas} depth={2} />
      </section>

      <section aria-labelledby="hist-h" style={{ marginTop: 32 }}>
        <h2 id="hist-h">Version history</h2>
        {history.length === 0 ? <p className="muted">No saved versions. Code defaults are in use.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Key</th><th scope="col" className="num">Version</th><th scope="col">Saved</th><th scope="col">By</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}><td className="num">{h.gameType}/{h.configKey}</td><td className="num">{h.version}</td><td>{fmtTime(h.updatedAt)}</td><td>{h.updatedBy ?? '--'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
