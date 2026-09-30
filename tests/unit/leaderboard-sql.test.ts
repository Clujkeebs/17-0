import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { allTimePointsExpr } from '@/lib/server/leaderboard-sql';

describe('all-time points SQL', () => {
  it('coalesces missing wins/rating so mini-game rows count as 0 points, never NULL', () => {
    const sqlText = new PgDialect().sqlToQuery(allTimePointsExpr).sql;
    // The regression: sum() without coalesce returned NULL for players whose result rows
    // have neither "wins" nor "rating", and Postgres sorts NULL first on DESC.
    expect(sqlText).toContain('coalesce');
    expect(sqlText).toContain(`"game_results"."result_data"->>'rating'`);
    expect(sqlText).toContain(`"game_results"."result_data"->>'wins'`);
    expect(sqlText).toContain(`"game_results"."game_type" = '17-0'`);
    // Outer guard wraps the whole case expression inside sum().
    expect(sqlText).toMatch(/sum\(coalesce\(case when/i);
  });
});
