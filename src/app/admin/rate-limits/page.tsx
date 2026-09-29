import type { Metadata } from 'next';
import { LIMITS } from '@/lib/server/rate-limit';
import { RateOverrideForm } from '../AdminClient';

export const metadata: Metadata = { title: 'Rate limits', description: 'Temporarily lift rate limits for an IP or user.', alternates: { canonical: '/admin/rate-limits' } };

export default function RateLimitsPage() {
  return (
    <div className="container section" style={{ maxWidth: 720 }}>
      <span className="eyebrow">Admin</span>
      <h1>Rate limit override</h1>
      <p className="muted">An override skips every limiter for that identifier until it expires. IP-scoped limits (spin, grade, newsletter, register) key on the hashed IP; per-user limits (gradeUser, delete) key on the user id.</p>
      <div className="card" style={{ margin: '24px 0' }}><RateOverrideForm /></div>
      <h2>Current limits</h2>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
        <table>
          <thead><tr><th scope="col">Scope</th><th scope="col" className="num">Max</th><th scope="col" className="num">Window</th></tr></thead>
          <tbody>
            {Object.entries(LIMITS).map(([k, v]) => (
              <tr key={k}><td className="num">{k}</td><td className="num">{v.max}</td><td className="num">{v.windowSec / 3600}h</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
