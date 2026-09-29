// k6 run -e BASE=https://staging.gridironlab.example tests/load/spin.k6.js
// 1,000 concurrent virtual users spinning 17-0. Rate limits are keyed by IP, so run
// against staging with a rate-limit override for the load generator IP (see /admin/rate-limits).
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: { spins: { executor: 'ramping-vus', stages: [{ duration: '1m', target: 1000 }, { duration: '3m', target: 1000 }, { duration: '30s', target: 0 }] } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<800'] },
};

const BASE = __ENV.BASE || 'http://localhost:3000';
export default function () {
  const r = http.post(`${BASE}/api/games/17-0/spin`, JSON.stringify({ daily: Math.random() < 0.5 }), { headers: { 'content-type': 'application/json' } });
  check(r, { 'spin 200': (x) => x.status === 200, 'six teams': (x) => x.json('teams.length') === 6 });
  sleep(1 + Math.random() * 2);
}
