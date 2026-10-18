import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { CASUAL_PERFECTS_PER_DAY, SEASON_GAMES, allTimePointsExpr, countedPerfect, hasUndefeated, perfectResult, perfectSeasonRows } from '@/lib/server/leaderboard-sql';

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

describe('undefeated board SQL', () => {
  const render = (q: Parameters<PgDialect['sqlToQuery']>[0]) => new PgDialect().sqlToQuery(q);

  it('knows which games can go undefeated and how long their seasons are', () => {
    expect(SEASON_GAMES).toEqual({ '17-0': 17, '82-0': 82, '162-0': 162, '44-0': 44 });
    for (const g of ['17-0', '82-0', '162-0', '44-0']) expect(hasUndefeated(g), g).toBe(true);
    for (const g of ['build-a-player', 'higher-lower', 'toString', 'constructor', '']) expect(hasUndefeated(g), g).toBe(false);
  });

  it('matches a perfect result in each of the four draft games, comparing wins as text so no cast can fail', () => {
    const { sql: text, params } = render(perfectResult);
    expect(params).toEqual(['17-0', '17', '82-0', '82', '162-0', '162', '44-0', '44']);
    expect(text).toContain(`result_data->>'wins' =`);
    expect(text).not.toContain('::int');
    expect((text.match(/ or /g) ?? []).length).toBe(3);
  });

  it('leaves flagged results and guests out, and numbers each player\'s results per game, kind and Eastern day', () => {
    const { sql: text } = render(perfectSeasonRows());
    expect(text).toContain('user_id is not null and not flagged');
    expect(text).toContain('partition by user_id, game_type, is_daily');
    expect(text).toContain(`at time zone 'America/New_York'`);
  });

  it('counts every Today perfect and caps Casual ones at five a day, like the points do', () => {
    expect(CASUAL_PERFECTS_PER_DAY).toBe(5);
    const { sql: text, params } = render(countedPerfect);
    expect(text).toBe('(is_daily or nth <= $1)');
    expect(params).toEqual([5]);
  });
});
