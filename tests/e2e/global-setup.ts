import postgres from 'postgres';
import Redis from 'ioredis';

/**
 * Test databases have no ESPN, Stats API or Sleeper history. Stand-in rows (ids far above real ones, names marked
 * "Test") are written once, before any test runs, so no spec depends on another spec having run first.
 */
async function seedNba() {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  const [{ n }] = await sql`select count(*)::int as n from nba_player_seasons where player_id >= 9000000`;
  if (n === 0) {
    const pos = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'];
    const eraSeasons = [1985, 1995, 2005, 2015, 2024];
    for (let t = 1; t <= 12; t++) {
      for (const season of eraSeasons) {
        await sql`insert into nba_team_seasons (team_id, season, name, location, abbreviation, color) values (${9000 + t}, ${season}, ${`Testers ${t}`}, ${'Test City'}, ${`T${t}`}, ${'#335577'}) on conflict do nothing`;
        for (let i = 0; i < 7; i++) {
          const id = 9000000 + t * 1000 + season - 1980 + i * 100;
          await sql`insert into nba_players (id, full_name, position) values (${id}, ${`Test ${pos[i]} ${t}-${season}`}, ${pos[i]}) on conflict do nothing`;
          await sql`insert into nba_player_seasons (player_id, team_id, season, gp, mpg, ppg, rpg, apg, spg, bpg, tov, fg_pct, value)
            values (${id}, ${9000 + t}, ${season}, 70, 30, ${10 + i * 2}, 5, 3, 1, 0.5, 2, 0.47, ${70 + i * 3}) on conflict do nothing`;
        }
      }
    }
  }
  // Standard (2K): stand-in overalls on 22 current rosters of six, so the edition opens.
  const [{ r }] = await sql`select count(distinct rating_2k)::int as r from nba_players where id >= 9500000 and rating_2k is not null`;
  if (r < 15) {
    for (let t = 1; t <= 22; t++) {
      await sql`insert into nba_team_seasons (team_id, season, name, location, abbreviation, color) values (${9000 + t}, 2024, ${`Testers ${t}`}, ${'Test City'}, ${`T${t}`}, ${'#335577'}) on conflict do nothing`;
      for (let i = 0; i < 6; i++) {
        const id = 9500000 + t * 10 + i;
        await sql`insert into nba_players (id, full_name, position, rating_2k, rating_2k_position, rating_2k_team_id) values (${id}, ${`Test 2K ${t}-${i}`}, ${['PG', 'SG', 'SF', 'PF', 'C', 'G'][i]}, ${70 + i * 3 + (t % 3)}, ${['PG', 'SG', 'SF', 'PF', 'C', 'G'][i]}, ${9000 + t})
          on conflict (id) do update set rating_2k = excluded.rating_2k, rating_2k_position = excluded.rating_2k_position, rating_2k_team_id = excluded.rating_2k_team_id`;
      }
    }
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    await redis.del('nba:2k-teams', 'nba:era-teams');
    redis.disconnect();
  }
  await sql.end();
}

async function seedMlb() {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  const [{ n }] = await sql`select count(*)::int as n from mlb_player_seasons where player_id >= 8000000`;
  if (n === 0) {
    const pos = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
    const eraSeasons = [1975, 1985, 1995, 2005, 2015, 2024];
    await sql`insert into mlb_team_seasons (team_id, season, name, location, abbreviation)
      select 9000 + t, s, 'Testers ' || t, 'Test City', 'T' || t from generate_series(1, 14) t, unnest(${eraSeasons}::int[]) s on conflict do nothing`;
    for (let i = 0; i < pos.length; i++) {
      const kind = pos[i] === 'SP' ? 'sp' : pos[i] === 'RP' ? 'rp' : 'bat';
      const line = kind === 'bat' ? { pa: 600, ops: 0.8, hr: 20, sb: 5, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 } : kind === 'sp' ? { gs: 30, g: 30, ip: 190, era: 3.4, so: 180, sv: 0, w: 14, whip: 1.15 } : { gs: 0, g: 60, ip: 62, era: 2.6, so: 70, sv: 30, w: 3, whip: 1.05 };
      await sql`insert into mlb_players (id, full_name, position)
        select 8000000 + t * 1000 + s - 1970 + ${i} * 100000, 'Test ' || ${pos[i]} || ' ' || t || '-' || s, ${pos[i]} from generate_series(1, 14) t, unnest(${eraSeasons}::int[]) s on conflict do nothing`;
      await sql`insert into mlb_player_seasons (player_id, team_id, season, kind, position, line, value)
        select 8000000 + t * 1000 + s - 1970 + ${i} * 100000, 9000 + t, s, ${kind}, ${pos[i]}, ${sql.json(line)}, 70 + ${i} + (t % 5) from generate_series(1, 14) t, unnest(${eraSeasons}::int[]) s on conflict do nothing`;
    }
  }
  // Right now: this season on 22 franchises (same formula as latestMlbSeason).
  const now = new Date(), y = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const [{ m }] = await sql`select count(distinct team_id)::int as m from mlb_player_seasons where season = ${y} and player_id >= 8000000`;
  if (m < 20) {
    const pos = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
    await sql`insert into mlb_team_seasons (team_id, season, name, location, abbreviation) select 9000 + t, ${y}, 'Testers ' || t, 'Test City', 'T' || t from generate_series(1, 22) t on conflict do nothing`;
    for (let i = 0; i < pos.length; i++) {
      const kind = pos[i] === 'SP' ? 'sp' : pos[i] === 'RP' ? 'rp' : 'bat';
      const line = kind === 'bat' ? { pa: 600, ops: 0.8, hr: 20, sb: 5, avg: 0.28, obp: 0.35, slg: 0.45, rbi: 80 } : kind === 'sp' ? { gs: 30, g: 30, ip: 190, era: 3.4, so: 180, sv: 0, w: 14, whip: 1.15 } : { gs: 0, g: 60, ip: 62, era: 2.6, so: 70, sv: 30, w: 3, whip: 1.05 };
      await sql`insert into mlb_players (id, full_name, position) select 8900000 + t * 100 + ${i}, 'Test Now ' || ${pos[i]} || ' ' || t, ${pos[i]} from generate_series(1, 22) t on conflict do nothing`;
      await sql`insert into mlb_player_seasons (player_id, team_id, season, kind, position, line, value)
        select 8900000 + t * 100 + ${i}, 9000 + t, ${y}, ${kind}, ${pos[i]}, ${sql.json(line)}, 72 + ${i} from generate_series(1, 22) t on conflict do nothing`;
    }
  }
  await sql.end();
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  await redis.del('mlb:era-teams');
  redis.disconnect();
}

async function seedFantasy() {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  await sql`update players set fantasy_proj_ppg = round((overall_rating / 5.0)::numeric, 1), fantasy_games = 0
    where fantasy_proj_ppg is null and fantasy_ppg is null and is_active and position in ('QB','HB','FB','WR','TE')`;
  await sql.end();
}

/** Soccer: two stand-in leagues of eight clubs, five players each, all on the leader lists for two seasons. */
async function seedSoccer() {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron', { max: 1 });
  const [{ n }] = await sql`select count(*)::int as n from soccer_players where id >= 9900000`;
  if (n === 0) {
    const now = new Date(), cur = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const nations = ['England', 'Spain', 'France', 'Brazil', 'Argentina', 'Germany', 'Portugal', 'Netherlands'];
    const pos = ['G', 'D', 'M', 'F', 'F'];
    for (const [li, league] of ['eng.1', 'esp.1'].entries()) {
      for (let c = 1; c <= 8; c++) {
        const club = 990000 + li * 100 + c;
        await sql`insert into soccer_clubs (id, league, name, abbreviation, color) values (${club}, ${league}, ${`Test FC ${li}-${c}`}, ${`T${li}${c}`}, '#225588') on conflict do nothing`;
        for (let k = 0; k < 5; k++) {
          const id = 9900000 + li * 10000 + c * 100 + k;
          await sql`insert into soccer_players (id, name, club_id, league, position, age, nationality) values (${id}, ${`Test Striker ${li}-${c}-${k}`}, ${club}, ${league}, ${pos[k]}, ${20 + k}, ${nations[(c + k) % nations.length]}) on conflict do nothing`;
          for (const season of [cur - 1, cur]) await sql`insert into soccer_leaders (season, league, player_id, name, club_id, goals, assists, matches) values (${season}, ${league}, ${id}, ${`Test Striker ${li}-${c}-${k}`}, ${club}, ${4 + ((c * 7 + k * 3 + season) % 20)}, ${2 + ((c + k * 5) % 11)}, 30) on conflict do nothing`;
        }
      }
    }
  }
  await sql.end();
}

export default async function globalSetup() {
  await seedSoccer();
  await seedNba();
  await seedMlb();
  await seedFantasy();
}
