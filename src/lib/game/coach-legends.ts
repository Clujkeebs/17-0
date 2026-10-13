/**
 * All-time head coaches for 17-0's All-time pool. ESPN has no usable coach history (its team-season coach lookups
 * return today's coach for every year), so the list is written by hand: each coach with the franchise he is
 * identified with, the seasons he ran it, his regular season record there and what he won. In All-time mode the
 * franchise's board offers them next to its current head coach.
 *
 * `years` are seasons named by the year they start (1970 is the 1970-71 season), as segments for coaches who left and
 * came back. `finals` counts title games reached, wins included; `playoffs` counts playoff seasons with the franchise.
 * The worker checks each record against ESPN's team records (`[coach-legends]` in its logs), so a wrong number shows up.
 */
export interface CoachLegend {
  key: string;
  name: string;
  /** Franchise abbreviation as in the teams table. */
  team: string;
  years: [number, number][];
  w: number; l: number; t: number;
  titles: number; finals: number; playoffs: number;
  /** The full span he held the job when it began or ended mid-season (the record counts whole seasons only). */
  tenure?: [number, number];
}

const C = (key: string, name: string, team: string, years: [number, number][], w: number, l: number, t: number, titles: number, finals: number, playoffs: number, tenure?: [number, number]): CoachLegend =>
  ({ key, name, team, years, w, l, t, titles, finals, playoffs, ...(tenure ? { tenure } : {}) });

export const COACH_LEGENDS: CoachLegend[] = [
  C('coryell-ari', 'Don Coryell', 'ARI', [[1973, 1977]], 42, 27, 1, 0, 0, 2),
  C('arians-ari', 'Bruce Arians', 'ARI', [[2013, 2017]], 49, 30, 1, 0, 0, 2),
  C('reeves-atl', 'Dan Reeves', 'ATL', [[1997, 2002]], 46, 49, 1, 0, 1, 2, [1997, 2003]),
  C('smith-atl', 'Mike Smith', 'ATL', [[2008, 2014]], 66, 46, 0, 0, 0, 4),
  C('billick-bal', 'Brian Billick', 'BAL', [[2000, 2007]], 80, 48, 0, 1, 1, 4),
  C('levy-buf', 'Marv Levy', 'BUF', [[1987, 1997]], 110, 65, 0, 0, 4, 8, [1986, 1997]),
  C('fox-car', 'John Fox', 'CAR', [[2002, 2010]], 73, 71, 0, 0, 1, 3),
  C('rivera-car', 'Ron Rivera', 'CAR', [[2011, 2018]], 71, 56, 1, 0, 1, 4, [2011, 2019]),
  C('ditka-chi', 'Mike Ditka', 'CHI', [[1982, 1992]], 106, 62, 0, 1, 1, 7),
  C('smith-chi', 'Lovie Smith', 'CHI', [[2004, 2012]], 81, 63, 0, 0, 1, 3),
  C('lewis-cin', 'Marvin Lewis', 'CIN', [[2003, 2018]], 131, 122, 3, 0, 0, 7),
  C('wyche-cin', 'Sam Wyche', 'CIN', [[1984, 1991]], 61, 66, 0, 0, 1, 2),
  C('landry-dal', 'Tom Landry', 'DAL', [[1960, 1988]], 250, 162, 6, 2, 5, 18),
  C('johnson-dal', 'Jimmy Johnson', 'DAL', [[1989, 1993]], 44, 36, 0, 2, 2, 3),
  C('switzer-dal', 'Barry Switzer', 'DAL', [[1994, 1997]], 40, 24, 0, 1, 1, 3),
  C('reeves-den', 'Dan Reeves', 'DEN', [[1981, 1992]], 110, 73, 1, 0, 3, 6),
  C('shanahan-den', 'Mike Shanahan', 'DEN', [[1995, 2008]], 138, 86, 0, 2, 2, 7),
  C('fox-den', 'John Fox', 'DEN', [[2011, 2014]], 46, 18, 0, 0, 1, 4),
  C('kubiak-den', 'Gary Kubiak', 'DEN', [[2015, 2016]], 24, 8, 0, 1, 1, 1),
  C('parker-det', 'Buddy Parker', 'DET', [[1951, 1956]], 47, 23, 2, 2, 3, 3),
  C('caldwell-det', 'Jim Caldwell', 'DET', [[2014, 2017]], 36, 28, 0, 0, 0, 2),
  C('lombardi-gb', 'Vince Lombardi', 'GB', [[1959, 1967]], 89, 29, 4, 5, 6, 6),
  C('holmgren-gb', 'Mike Holmgren', 'GB', [[1992, 1998]], 75, 37, 0, 1, 2, 6),
  C('mccarthy-gb', 'Mike McCarthy', 'GB', [[2006, 2017]], 121, 70, 1, 1, 1, 9, [2006, 2018]),
  C('obrien-hou', "Bill O'Brien", 'HOU', [[2014, 2019]], 52, 44, 0, 0, 0, 4, [2014, 2020]),
  C('dungy-ind', 'Tony Dungy', 'IND', [[2002, 2008]], 85, 27, 0, 1, 1, 7),
  C('mccafferty-ind', 'Don McCafferty', 'IND', [[1970, 1971]], 21, 6, 1, 1, 1, 2, [1970, 1972]),
  C('ewbank-ind', 'Weeb Ewbank', 'IND', [[1954, 1962]], 59, 52, 1, 2, 2, 2),
  C('coughlin-jax', 'Tom Coughlin', 'JAX', [[1995, 2002]], 68, 60, 0, 0, 0, 4),
  C('stram-kc', 'Hank Stram', 'KC', [[1960, 1974]], 124, 76, 10, 3, 4, 6),
  C('schottenheimer-kc', 'Marty Schottenheimer', 'KC', [[1989, 1998]], 101, 58, 1, 0, 0, 7),
  C('gillman-lac', 'Sid Gillman', 'LAC', [[1960, 1969]], 83, 51, 6, 1, 5, 5),
  C('coryell-lac', 'Don Coryell', 'LAC', [[1978, 1985]], 69, 52, 0, 0, 0, 3, [1978, 1986]),
  C('knox-lar', 'Chuck Knox', 'LAR', [[1973, 1977]], 54, 15, 1, 0, 0, 5),
  C('allen-lar', 'George Allen', 'LAR', [[1966, 1970]], 49, 17, 4, 0, 0, 2),
  C('martz-lar', 'Mike Martz', 'LAR', [[2000, 2004]], 51, 29, 0, 0, 1, 4, [2000, 2005]),
  C('madden-lv', 'John Madden', 'LV', [[1969, 1978]], 103, 32, 7, 1, 1, 8),
  C('flores-lv', 'Tom Flores', 'LV', [[1979, 1987]], 83, 53, 0, 2, 2, 5),
  C('shula-mia', 'Don Shula', 'MIA', [[1970, 1995]], 257, 133, 2, 2, 5, 16),
  C('grant-min', 'Bud Grant', 'MIN', [[1967, 1983], [1985, 1985]], 158, 96, 5, 1, 4, 12),
  C('green-min', 'Dennis Green', 'MIN', [[1992, 2000]], 92, 52, 0, 0, 0, 8, [1992, 2001]),
  C('belichick-ne', 'Bill Belichick', 'NE', [[2000, 2023]], 266, 121, 0, 6, 9, 18),
  C('parcells-ne', 'Bill Parcells', 'NE', [[1993, 1996]], 32, 32, 0, 0, 1, 2),
  C('mora-no', 'Jim Mora', 'NO', [[1986, 1995]], 91, 68, 0, 0, 0, 4, [1986, 1996]),
  C('payton-no', 'Sean Payton', 'NO', [[2006, 2011], [2013, 2021]], 152, 89, 0, 1, 1, 9),
  C('parcells-nyg', 'Bill Parcells', 'NYG', [[1983, 1990]], 77, 49, 1, 2, 2, 5),
  C('coughlin-nyg', 'Tom Coughlin', 'NYG', [[2004, 2015]], 102, 90, 0, 2, 2, 5),
  C('ewbank-nyj', 'Weeb Ewbank', 'NYJ', [[1963, 1973]], 71, 77, 6, 1, 1, 2),
  C('parcells-nyj', 'Bill Parcells', 'NYJ', [[1997, 1999]], 29, 19, 0, 0, 0, 1),
  C('reid-phi', 'Andy Reid', 'PHI', [[1999, 2012]], 130, 93, 1, 0, 1, 9),
  C('vermeil-phi', 'Dick Vermeil', 'PHI', [[1976, 1982]], 54, 47, 0, 0, 1, 4),
  C('pederson-phi', 'Doug Pederson', 'PHI', [[2016, 2020]], 42, 37, 1, 1, 1, 3),
  C('ryan-phi', 'Buddy Ryan', 'PHI', [[1986, 1990]], 43, 35, 1, 0, 0, 3),
  C('noll-pit', 'Chuck Noll', 'PIT', [[1969, 1991]], 193, 148, 1, 4, 4, 12),
  C('cowher-pit', 'Bill Cowher', 'PIT', [[1992, 2006]], 149, 90, 1, 1, 2, 10),
  C('holmgren-sea', 'Mike Holmgren', 'SEA', [[1999, 2008]], 86, 74, 0, 0, 1, 6),
  C('knox-sea', 'Chuck Knox', 'SEA', [[1983, 1991]], 80, 63, 0, 0, 0, 4),
  C('carroll-sea', 'Pete Carroll', 'SEA', [[2010, 2023]], 137, 89, 1, 1, 2, 10),
  C('walsh-sf', 'Bill Walsh', 'SF', [[1979, 1988]], 92, 59, 1, 3, 3, 8),
  C('seifert-sf', 'George Seifert', 'SF', [[1989, 1996]], 98, 30, 0, 2, 2, 8),
  C('harbaugh-sf', 'Jim Harbaugh', 'SF', [[2011, 2014]], 44, 19, 1, 0, 1, 3),
  C('dungy-tb', 'Tony Dungy', 'TB', [[1996, 2001]], 56, 40, 0, 0, 0, 4),
  C('gruden-tb', 'Jon Gruden', 'TB', [[2002, 2008]], 57, 55, 0, 1, 1, 3),
  C('arians-tb', 'Bruce Arians', 'TB', [[2019, 2021]], 31, 18, 0, 1, 1, 2),
  C('fisher-ten', 'Jeff Fisher', 'TEN', [[1995, 2010]], 141, 115, 0, 0, 1, 6, [1994, 2010]),
  C('phillips-ten', 'Bum Phillips', 'TEN', [[1975, 1980]], 55, 35, 0, 0, 0, 3),
  C('gibbs-was', 'Joe Gibbs', 'WAS', [[1981, 1992], [2004, 2007]], 154, 94, 0, 3, 4, 10),
  C('allen-was', 'George Allen', 'WAS', [[1971, 1977]], 67, 30, 1, 0, 1, 5),
];

export const coachLegendId = (key: string) => `lcoach:${key}`;
export const isCoachLegendId = (id: string) => id.startsWith('lcoach:');
export const coachLegendByKey = (key: string) => COACH_LEGENDS.find((c) => c.key === key);
export const coachLegendsFor = (abbr: string) => COACH_LEGENDS.filter((c) => c.team === abbr);

/** Seasons coached, counting every segment. */
export const seasonsCoached = (c: CoachLegend) => c.years.reduce((s, [a, b]) => s + (b - a + 1), 0);

/**
 * A legend's grade on the 82 to 99 scale (today's head coaches run 80 to 97): winning percentage with the franchise
 * above all, then championships, title games lost, playoff trips and how long he stayed. Only the greatest reach 99.
 */
export function coachLegendGrade(c: CoachLegend): number {
  const pct = (c.w + c.t / 2) / Math.max(1, c.w + c.l + c.t);
  const raw = (pct - 0.5) * 30 + Math.min(c.titles, 6) * 2.2 + Math.min(Math.max(0, c.finals - c.titles), 3) * 0.7 + Math.min(c.playoffs, 14) * 0.4 + Math.min(seasonsCoached(c), 24) * 0.1;
  return Math.round((82 + Math.max(0, Math.min(17, raw * 0.9))) * 10) / 10;
}

/** The line a board row shows beside his name (the row already says Legend): his years and what he won. */
export function coachLegendLine(c: CoachLegend): string {
  const [first, last] = c.tenure ?? [c.years[0][0], c.years[c.years.length - 1][1]];
  const won = c.titles ? `${c.titles} title${c.titles > 1 ? 's' : ''}` : c.finals ? `${c.finals} title game${c.finals > 1 ? 's' : ''}` : '';
  return `${first}-${String(last).slice(2)}${won ? ` · ${won}` : ''}`;
}
