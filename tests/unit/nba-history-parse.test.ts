import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM script, no types
import { parsePlayerStats, parseRoster, parseSeasonIndex, parseInfobox, parseTeamStats, seasonEnd } from '../../scripts/nba-history-parse.mjs';
// @ts-expect-error plain ESM script, no types
import { cleanRow, matchEspn, photoFile, positionOf, teamOf, tidyCredit } from '../../scripts/build-nba-history.mjs';

const link = (title: string, text: string) => `<a rel="mw:WikiLink" href="https://en.wikipedia.org/wiki/${title}" title="${text}">${text}</a>`;
const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
const head = (cells: string[]) => `<tr>${cells.map((c) => `<th>${c}</th>`).join('')}</tr>`;

describe('season index', () => {
  it('lists the team-season articles of one season and drops the league pages', () => {
    const html = [
      '<a href="/wiki/1971%E2%80%9372_Los_Angeles_Lakers_season">x</a>', '<a href="/wiki/1971–72_Boston_Celtics_season">x</a>',
      '<a href="/wiki/1971–72_ABA_season">x</a>', '<a href="/wiki/1971–72_NBA_season">x</a>', '<a href="/wiki/1970–71_Boston_Celtics_season">x</a>',
    ].join('');
    expect(parseSeasonIndex(html, 1972)).toEqual(['1971–72_Boston_Celtics_season', '1971–72_Los_Angeles_Lakers_season']);
  });
});

describe('roster', () => {
  it('reads position, article title, name and birth date from the roster table', () => {
    const html = `<h2 id="Roster">Roster</h2><table>${head(['Pos.', 'No.', 'Player', 'Height', 'Weight', 'DOB', 'From'])}
      ${row(['F', '22', link('Elgin_Baylor', 'Elgin Baylor'), '6 ft 5 in', '225 lb', '1934-09-16', 'Seattle'])}
      ${row(['C', '13', link('Wilt_Chamberlain', 'Wilt Chamberlain'), '7 ft 1 in', '275 lb', '1936-08-21', 'Kansas'])}</table>
      <h2 id="Regular_season">Regular season</h2><table>${row(['x', 'y', 'z', 'w'])}</table>`;
    expect(parseRoster(html)).toEqual([
      { pos: 'F', name: 'Elgin Baylor', title: 'Elgin_Baylor', dob: '1934-09-16' },
      { pos: 'C', name: 'Wilt Chamberlain', title: 'Wilt_Chamberlain', dob: '1936-08-21' },
    ]);
  });
});

describe('player career table', () => {
  const table = (rows: string[]) => `<table>${head(['Year', 'Team(s)', 'GP', 'MPG', 'FG%', 'FT%', 'RPG', 'APG', 'PPG'])}${rows.join('')}</table>`;
  const html = [
    '<h2 id="Regular_season">Regular season</h2>',
    table([
      row(['1964–65', link('1964–65_San_Francisco_Warriors_season', 'San Francisco'), '38', '45.9', '.499*', '.416', '23.5', '3.1', '38.9*']),
      // A trade: the second row has no year cell because the year spans two rows.
      row([link('1964–65_Philadelphia_76ers_season', 'Philadelphia'), '35', '44.5', '.528*', '.526', '22.3', '3.8', '30.1*']),
      row(['1966–67†', link('1966–67_Philadelphia_76ers_season', 'Philadelphia'), '81*', '45.5*', '.683*', '.441', '24.2*', '7.8', '24.1']),
      row(['Career', '1,045', '45.8‡', '.540', '.511', '22.9‡', '4.4', '30.1']),
      row(['All-Star', '13', '29.8', '.590', '.500', '15.1', '2.7', '14.6']),
    ]),
    '<h2 id="Playoffs">Playoffs</h2>',
    table([row(['1960', 'Philadelphia', '9', '46.1', '.496', '.445', '25.8', '2.1', '33.2'])]),
  ].join('');

  it('keeps the regular season, handles a traded year, strips the footnote marks and skips career rows and playoffs', () => {
    const [t] = parsePlayerStats(html);
    expect(t.heading).toBe('Regular_season');
    expect(t.rows).toHaveLength(3);
    expect(t.rows[0]).toMatchObject({ season: 1965, team: '1964–65_San_Francisco_Warriors_season', gp: 38, mpg: 45.9, fg: 0.499, rpg: 23.5, apg: 3.1, ppg: 38.9, spg: null });
    expect(t.rows[1]).toMatchObject({ season: 1965, team: '1964–65_Philadelphia_76ers_season', gp: 35, ppg: 30.1 });
    expect(t.rows[2]).toMatchObject({ season: 1967, gp: 81, mpg: 45.5, fg: 0.683, ppg: 24.1 });
  });

  it('drops ABA rows and tables that hold totals', () => {
    const aba = `<h2 id="Regular_season">Regular season</h2><table>${head(['Season', 'Team', 'GP', 'GS', 'MIN', 'FG%', '3P%', 'FT%', 'OFF', 'DEF', 'REB', 'AST', 'STL', 'BLK', 'PPG'])}
      ${row(['1973–74', 'Virginia (ABA)', '49', '—', '35.3', '.472', '.160', '.799', '2.2', '6.3', '8.5', '2.0', '1.5', '1.8', '25.4'])}
      ${row(['1976–77', link('1976–77_San_Antonio_Spurs_season', 'San Antonio'), '82', '—', '33.0', '.544', '—', '.833', '1.9', '3.6', '5.5', '2.9', '1.3', '1.3', '23.1'])}</table>`;
    const [t] = parsePlayerStats(aba);
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0]).toMatchObject({ season: 1977, gp: 82, rpg: 5.5, spg: 1.3, bpg: 1.3, ppg: 23.1, tp: null });
  });

  it('reads the infobox position, birth date and the real title', () => {
    const ib = '<title>George Gervin - Wikipedia</title><table class="infobox vcard"><tr><th>Position</th><td>Shooting guard / small forward</td></tr></table><span class="bday">1952-04-27</span>';
    expect(parseInfobox(ib)).toEqual({ position: 'Shooting guard / small forward', bday: '1952-04-27', title: 'George Gervin' });
    // The page of a redirect comes back under the article's real title.
    expect(parseInfobox('<title>Kareem Abdul-Jabbar - Wikipedia</title>').title).toBe('Kareem Abdul-Jabbar');
    expect(parseInfobox('<p>no title</p>').title).toBeNull();
  });

  it('names a season by the year it ends', () => {
    expect(seasonEnd('1959–60')).toBe(1960);
    expect(seasonEnd('1971–72†')).toBe(1972);
    expect(seasonEnd('1999–00')).toBe(2000);
  });
});

describe('team-season player statistics', () => {
  // Wikipedia wraps each abbreviation in a template whose data attribute holds markup, with a ">" inside it.
  const abbr = (label: string) => `<th data-mw='{"parts":[{"params":{"2":{"wt":"x&lt;/span>"}}}]}'> ${label}</th>`;
  const heads = (labels: string[]) => `<tr>${labels.map(abbr).join('')}</tr>`;
  const players = (rows: string[][]) => rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  const html = (labels: string[], rows: string[][], heading = 'Regular_season') =>
    `<h2 id="Player_statistics">Player statistics</h2><h3 id="${heading}">x</h3><table>${heads(labels)}${players(rows)}</table>`;

  it('takes the per-game columns when the table also lists totals', () => {
    const labels = ['Player', 'POS', 'GP', 'GS', 'MP', 'REB', 'AST', 'STL', 'BLK', 'PTS', 'MPG', 'RPG', 'APG', 'SPG', 'BPG', 'PPG'];
    const rows = [
      [link('George_Gervin', 'George Gervin'), 'SG', '82', '82', '2,857', '420', '302', '136', '110', '2,232', '34.8', '5.1', '3.7', '1.7', '1.3', '27.2'],
      ['Louie Dampier', 'PG', '82', '', '2,037', '122', '285', '87', '13', '748', '24.8', '1.5', '3.5', '1.1', '.2', '9.1'],
      ['Mike Green†', 'C', '63', '', '1,132', '304', '66', '24', '87', '476', '18.0', '4.8', '1.0', '.4', '1.4', '7.6'],
      ['Larry Kenon', 'SF', '81', '', '2,869', '773', '268', '115', '24', '1,672', '35.4', '9.5', '3.3', '1.4', '.3', '20.6'],
      ['Billy Paultz', 'C', '80', '', '2,479', '675', '213', '42', '194', '1,266', '31.0', '8.4', '2.7', '.5', '2.4', '15.8'],
      ['Team', '', '82', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const out = parseTeamStats(html(labels, rows));
    expect(out).toHaveLength(5);
    expect(out[0]).toMatchObject({ name: 'George Gervin', title: 'George_Gervin', gp: 82, mpg: 34.8, rpg: 5.1, apg: 3.7, spg: 1.7, bpg: 1.3, ppg: 27.2, fg: null });
    expect(out[2]).toMatchObject({ name: 'Mike Green', title: null, gp: 63, bpg: 1.4 });
  });

  it('turns totals into per-game numbers when that is all the table has', () => {
    const labels = ['Player', 'GP', 'REB', 'AST', 'STL', 'BLK', 'PTS', 'AVG'];
    const rows = Array.from({ length: 6 }, (_, i) => [`Player ${i + 1}`, '80', '640', '400', '80', '20', '1,600', '20.0']);
    const [first] = parseTeamStats(html(labels, rows));
    expect(first).toMatchObject({ gp: 80, rpg: 8, apg: 5, spg: 1, bpg: 0.3, ppg: 20, mpg: null });
  });

  it('divides points and minutes when they are totals and reads shooting percentages', () => {
    const labels = ['Player', 'GP', 'MP', 'FG', 'FGA', 'FG%', 'FT', 'FTA', 'FT%', 'ORB', 'DRB', 'TRB', 'AST', 'STL', 'BLK', 'PF', 'PTS'];
    const rows = Array.from({ length: 6 }, (_, i) => [`Player ${i + 1}`, '60', '1,800', '300', '600', '.500', '100', '125', '.800', '', '', '300', '120', '', '', '150', '900']);
    const [first] = parseTeamStats(html(labels, rows));
    expect(first).toMatchObject({ gp: 60, mpg: 30, fg: 0.5, ft: 0.8, rpg: 5, apg: 2, ppg: 15, spg: null });
  });

  it('divides a column headed as an average when it holds season totals', () => {
    const labels = ['Player', 'GP', 'MPG', 'RPG', 'APG', 'PPG'];
    const rows = Array.from({ length: 6 }, (_, i) => [`Player ${i + 1}`, '80', '2,400', '5.0', '3.0', '15.0']);
    expect(parseTeamStats(html(labels, rows))[0]).toMatchObject({ gp: 80, mpg: 30 });
  });

  it('skips the playoffs and a table of too few games', () => {
    const labels = ['Player', 'GP', 'MPG', 'RPG', 'APG', 'PPG'];
    const rows = Array.from({ length: 6 }, (_, i) => [`Player ${i + 1}`, '82', '30.0', '5.0', '3.0', '15.0']);
    expect(parseTeamStats(html(labels, rows, 'Playoffs_2'))).toEqual([]);
    expect(parseTeamStats(html(labels, rows.map((r) => ['x', '6', ...r.slice(2)])))).toEqual([]);
    expect(parseTeamStats('<p>nothing here</p>')).toEqual([]);
  });
});

describe('team and position mapping', () => {
  it('maps team-season titles to ESPN franchise ids through moves and renames', () => {
    expect(teamOf('1961–62_Philadelphia_Warriors_season')).toMatchObject({ franchise: 9, location: 'Philadelphia', nickname: 'Warriors' });
    expect(teamOf('1964–65_San_Francisco_Warriors_season')).toMatchObject({ franchise: 9, location: 'San Francisco' });
    expect(teamOf('1962–63_Chicago_Zephyrs_season')).toMatchObject({ franchise: 27, nickname: 'Zephyrs' });
    expect(teamOf('1973–74_Capital_Bullets_season')).toMatchObject({ franchise: 27, location: 'Capital' });
    expect(teamOf('1972–73_Kansas_City–Omaha_Kings_season')).toMatchObject({ franchise: 23, abbr: 'KCO' });
    expect(teamOf('1968–69_San_Diego_Rockets_season')).toMatchObject({ franchise: 10 });
    expect(teamOf('1978–79_Seattle_SuperSonics_season')).toMatchObject({ franchise: 25, logo: null });
    expect(teamOf('1978–79_San_Diego_Clippers_season')).toMatchObject({ franchise: 12 });
    expect(teamOf('1971–72_Los_Angeles_Lakers_season')).toMatchObject({ franchise: 13, logo: 'lal' });
    expect(teamOf('1971–72_NBA_season')).toBeNull();
  });

  it('leaves the ABA years out and starts the four ABA teams with the 1976-77 NBA season', () => {
    expect(teamOf('1975–76_Denver_Nuggets_season')).toBeNull();
    expect(teamOf('1975-76_New_York_Nets_season')).toBeNull();
    expect(teamOf('1976-77_New_York_Nets_season')).toMatchObject({ franchise: 17, location: 'New York' });
    expect(teamOf('1976–77_San_Antonio_Spurs_season')).toMatchObject({ franchise: 24 });
    expect(teamOf('1974–75_Utah_Stars_season')).toBeNull();
  });

  it('falls back to the city or the franchise article when a row does not link to the team season', () => {
    expect(teamOf(null, 1966, 'Philadelphia')).toMatchObject({ franchise: 20, nickname: '76ers' });
    expect(teamOf(null, 1961, 'Philadelphia')).toMatchObject({ franchise: 9, nickname: 'Warriors' });
    expect(teamOf('Phoenix_Suns', 1975, 'Phoenix')).toMatchObject({ franchise: 21 });
    expect(teamOf(null, 1975, 'New Orleans')).toMatchObject({ franchise: 26 });
    expect(teamOf(null, 1965, 'Phoenix')).toBeNull();
    expect(teamOf(null, 1968, 'Chicago')).toMatchObject({ franchise: 4 });
    expect(teamOf(null, 1963, 'Chicago')).toMatchObject({ franchise: 27 });
  });

  it('turns an infobox position into one of the keys the engine knows', () => {
    expect(positionOf('Center', null)).toBe('C');
    expect(positionOf('Shooting guard / small forward', null)).toBe('SG-SF');
    expect(positionOf('Small forward / shooting guard', null)).toBe('SG-SF');
    expect(positionOf('Power forward / small forward', null)).toBe('SF-PF');
    expect(positionOf('Point guard / shooting guard', null)).toBe('PG-SG');
    expect(positionOf('Forward / center', null)).toBe('F-C');
    expect(positionOf('Guard', null)).toBe('G');
    expect(positionOf(null, 'G')).toBe('G');
    expect(positionOf(null, 'F-C')).toBe('F-C');
  });
});

describe('cleaning the rows', () => {
  const good = { season: 1978, gp: 77, mpg: 25.1, ppg: 12.4, rpg: 3.1, apg: 4.8, spg: 1.1, bpg: 0.2, fg: 0.471, ft: 0.812, tp: null };

  it('puts a percentage typed without its point right', () => {
    expect(cleanRow({ ...good, fg: 442 })).toMatchObject({ fg: 0.442 });
    expect(cleanRow({ ...good, fg: 44.2, ft: 81.2 })).toMatchObject({ fg: 0.442, ft: 0.812 });
    expect(cleanRow({ ...good, fg: 12345 })).toMatchObject({ fg: null });
  });

  it('drops a row no player could have produced', () => {
    // Wikipedia carries a 5-foot-8 guard at 47.4 points and 30.2 rebounds in 25 minutes a night.
    expect(cleanRow({ ...good, ppg: 47.4, rpg: 30.2, fg: 0.999, ft: 0.999 })).toBeNull();
    expect(cleanRow({ ...good, gp: 0 })).toBeNull();
    expect(cleanRow({ ...good, mpg: 61 })).toBeNull();
    expect(cleanRow({ ...good, ppg: 30, mpg: 20 })).toBeNull();
  });

  it('keeps what the greats really did', () => {
    expect(cleanRow({ season: 1962, gp: 80, mpg: 48.5, ppg: 50.4, rpg: 25.7, apg: 2.4, spg: null, bpg: null, fg: 0.506, ft: 0.613, tp: null })).not.toBeNull();
    expect(cleanRow({ season: 1965, gp: 75, mpg: 45.6, ppg: 30.4, rpg: 9, apg: 11.5, spg: null, bpg: null, fg: 0.48, ft: 0.839, tp: null })).not.toBeNull();
    expect(cleanRow({ season: 1964, gp: 78, mpg: 44.6, ppg: 15, rpg: 24.7, apg: 4.7, spg: null, bpg: null, fg: 0.433, ft: 0.55, tp: null })).not.toBeNull();
  });

  it('does not believe a long season at four fifths from the field', () => {
    expect(cleanRow({ ...good, fg: 0.85 })).toMatchObject({ fg: null });
    expect(cleanRow({ ...good, gp: 2, fg: 1 })).toMatchObject({ fg: 1 });
  });
});

describe('matching a player to ESPN', () => {
  const dump = [
    { id: 3814, name: 'Robert Parish', seasons: [1985, 1986, 1987, 1997] },
    { id: 11, name: 'George Johnson', seasons: [2001, 2002] },
    { id: 12, name: 'George Johnson', seasons: [1985, 1986, 1987, 1988] },
    { id: 1708, name: 'Mike Dunleavy', seasons: [2003, 2004, 2010] },
    { id: 77, name: 'Marvin Webster', seasons: [1985, 1986] },
  ];
  const kept = (title: string, name: string, late: number[]) => ({ title, name, late: new Set(late) });

  it('takes the same name with the same seasons', () => {
    const found = matchEspn([kept('Robert_Parish', 'Robert Parish', [1985, 1986, 1987, 1997])], dump);
    expect(found.get('Robert_Parish')).toMatchObject({ id: 3814, how: 'name' });
  });

  it('keeps two people of one name apart by their seasons, and a father from his son', () => {
    const found = matchEspn([kept('George_Johnson_(a)', 'George Johnson', [1985, 1986, 1987]), kept('Mike_Dunleavy_Sr.', 'Mike Dunleavy Sr.', [1985, 1990])], dump);
    expect(found.get('George_Johnson_(a)')?.id).toBe(12);
    expect(found.has('Mike_Dunleavy_Sr.')).toBe(false);
  });

  it('matches a nickname on the last name when the seasons are the same', () => {
    const found = matchEspn([kept('Marvin_Barnes', 'Marvin "Bad News" Webster', [1985, 1986])], dump);
    expect(found.get('Marvin_Barnes')).toMatchObject({ id: 77, how: 'last name' });
  });

  it('leaves two articles on one player without a match when neither is closer', () => {
    const found = matchEspn([kept('A', 'Robert Parish', [1985, 1986]), kept('B', 'Robert Parish', [1985, 1986])], dump);
    expect(found.size).toBe(0);
  });
});

describe('player photos', () => {
  const infobox = (img: string) => `<table class="infobox vcard"><tr><td>${img}</td></tr></table>`;
  it('takes the infobox photo when it lives on Wikimedia Commons', () => {
    const img = '<img resource="https://en.wikipedia.org/wiki/File:Wilt_Chamberlain_1960_(cropped).jpg" src="//upload.wikimedia.org/wikipedia/commons/thumb/1/11/Wilt.jpg/250px-Wilt.jpg">';
    expect(photoFile(infobox(img))).toBe('Wilt Chamberlain 1960 (cropped).jpg');
  });
  it('leaves out files kept on English Wikipedia, which are often not free, and pages with no infobox photo', () => {
    expect(photoFile(infobox('<img resource="https://en.wikipedia.org/wiki/File:Card.jpg" src="//upload.wikimedia.org/wikipedia/en/a/ab/Card.jpg">'))).toBeNull();
    expect(photoFile(infobox('<span>no image</span>'))).toBeNull();
    expect(photoFile('<p>no infobox</p>')).toBeNull();
  });
});

describe('photo credits', () => {
  it('says a doubled unknown author once and cuts a long note to its first sentence', () => {
    expect(tidyCredit('Unknown authorUnknown author, Public domain')).toBe('Unknown author, Public domain');
    expect(tidyCredit('Bill Allen, Public domain')).toBe('Bill Allen, Public domain');
    expect(tidyCredit(`This Photo was taken by Wolfgang Moroder. Feel free to use my photos, but please mention me as the author. ${'x'.repeat(120)}, CC BY-SA 3.0`)).toBe('This Photo was taken by Wolfgang Moroder, CC BY-SA 3.0');
  });
});

describe('matching an article to an ESPN player', () => {
  it('accepts an article whose career table lists the seasons ESPN has, and turns away a namesake', async () => {
    // @ts-expect-error plain ESM script, no types
    const { seasonMatch } = await import('../../scripts/build-nba-photos.mjs');
    const head2 = (cells: string[]) => `<tr>${cells.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    const career = (years: string[]) => `<h2 id="Regular_season">Regular season</h2><table>${head2(['Year', 'Team', 'GP', 'MPG', 'RPG', 'APG', 'PPG'])}${years.map((y) => `<tr><td>${y}</td><td>${link(`${y}_Dallas_Mavericks_season`, 'Dallas')}</td><td>80</td><td>30.0</td><td>4.0</td><td>3.0</td><td>15.0</td></tr>`).join('')}</table>`;
    expect(seasonMatch(career(['1995–96', '1996–97', '1997–98']), [1996, 1997, 1998])).toBe(1);
    expect(seasonMatch(career(['2015–16', '2016–17']), [1996, 1997, 1998])).toBe(0);
    expect(seasonMatch('<p>none</p>', [1996])).toBe(0);
  });
});
