/**
 * Head coaches. PLACEHOLDER DATA: best-effort knowledge as of mid 2026, not an authoritative source.
 * Career records are regular season, approximate, through the 2025 season.
 *
 * Uncertainty: the January 2026 hiring cycle (ARI, ATL, BAL, BUF, CLE, LV, MIA, NYG, PIT, TEN) is
 * reconstructed from memory and should be verified before launch. Rows marked `// verify` are the
 * least certain. Admins can correct any row from the admin panel; the seed only fills gaps.
 */
export interface SeedCoach {
  fullName: string;
  team: string | null; // abbreviation, null for historical coaches
  careerWins: number;
  careerLosses: number;
  superBowlWins: number;
  yearsWithTeam: number;
  recent3yrWinPct: number; // 0..1
  playoffAppearances3yr: number;
}

type Row = [name: string, team: string | null, w: number, l: number, sb: number, yrs: number, pct3: number, po3: number];

const ROWS: Row[] = [
  // ---- Current (2026 season) ----
  ['Mike LaFleur', 'ARI', 0, 0, 0, 1, 0.5, 0], // verify
  ['Kevin Stefanski', 'ATL', 45, 56, 0, 1, 0.373, 1], // verify
  ['Jesse Minter', 'BAL', 0, 0, 0, 1, 0.5, 0], // verify
  ['Joe Brady', 'BUF', 0, 0, 0, 1, 0.5, 0], // verify
  ['Dave Canales', 'CAR', 13, 21, 0, 3, 0.382, 1],
  ['Ben Johnson', 'CHI', 11, 6, 0, 2, 0.647, 1],
  ['Zac Taylor', 'CIN', 52, 63, 0, 8, 0.471, 0],
  ['Todd Monken', 'CLE', 0, 0, 0, 1, 0.5, 0], // verify
  ['Brian Schottenheimer', 'DAL', 7, 9, 0, 2, 0.441, 0],
  ['Sean Payton', 'DEN', 184, 108, 1, 4, 0.627, 2],
  ['Dan Campbell', 'DET', 51, 33, 0, 6, 0.706, 2],
  ['Matt LaFleur', 'GB', 76, 41, 0, 8, 0.59, 3],
  ['DeMeco Ryans', 'HOU', 32, 19, 0, 4, 0.627, 3],
  ['Shane Steichen', 'IND', 25, 26, 0, 4, 0.49, 0],
  ['Liam Coen', 'JAX', 13, 4, 0, 2, 0.765, 1],
  ['Andy Reid', 'KC', 279, 157, 3, 14, 0.627, 2],
  ['Klint Kubiak', 'LV', 0, 0, 0, 1, 0.5, 0], // verify
  ['Jim Harbaugh', 'LAC', 66, 31, 0, 3, 0.647, 2],
  ['Sean McVay', 'LAR', 97, 61, 1, 10, 0.627, 3],
  ['Jeff Hafley', 'MIA', 0, 0, 0, 1, 0.5, 0], // verify
  ["Kevin O'Connell", 'MIN', 43, 25, 0, 5, 0.588, 1],
  ['Mike Vrabel', 'NE', 68, 48, 0, 2, 0.59, 1],
  ['Kellen Moore', 'NO', 6, 11, 0, 2, 0.353, 0],
  ['John Harbaugh', 'NYG', 180, 113, 1, 1, 0.647, 2], // verify
  ['Aaron Glenn', 'NYJ', 3, 14, 0, 2, 0.176, 0],
  ['Nick Sirianni', 'PHI', 59, 26, 1, 6, 0.706, 3],
  ['Mike McCarthy', 'PIT', 174, 112, 1, 1, 0.5, 1], // verify
  ['Kyle Shanahan', 'SF', 88, 72, 0, 10, 0.588, 2],
  ['Mike Macdonald', 'SEA', 23, 11, 1, 3, 0.676, 1], // verify Super Bowl LX result
  ['Todd Bowles', 'TB', 61, 90, 0, 5, 0.529, 2],
  ['Robert Saleh', 'TEN', 20, 36, 0, 1, 0.4, 0], // verify
  ['Dan Quinn', 'WAS', 60, 59, 0, 3, 0.5, 1],

  // ---- Historical (teamId null). recent3yrWinPct uses career win pct as a stand-in. ----
  ['Bill Belichick', null, 302, 165, 6, 0, 0.647, 3],
  ['Vince Lombardi', null, 96, 34, 2, 0, 0.738, 3],
  ['Bill Walsh', null, 92, 59, 3, 0, 0.609, 3],
  ['Chuck Noll', null, 193, 148, 4, 0, 0.566, 3],
  ['Don Shula', null, 328, 156, 2, 0, 0.678, 3],
  ['Tom Landry', null, 250, 162, 2, 0, 0.607, 3],
  ['Bill Parcells', null, 172, 130, 2, 0, 0.57, 2],
  ['Joe Gibbs', null, 154, 94, 3, 0, 0.621, 3],
  ['John Madden', null, 103, 32, 1, 0, 0.763, 3],
  ['Tony Dungy', null, 139, 69, 1, 0, 0.668, 3],
  ['Bill Cowher', null, 149, 90, 1, 0, 0.623, 3],
  ['Mike Holmgren', null, 161, 111, 1, 0, 0.592, 2],
  ['Jimmy Johnson', null, 80, 64, 2, 0, 0.556, 2],
  ['George Halas', null, 318, 148, 0, 0, 0.682, 2],
  ['Tom Coughlin', null, 170, 150, 2, 0, 0.531, 2],
  ['Pete Carroll', null, 173, 134, 1, 0, 0.563, 2],
  ['Mike Tomlin', null, 193, 114, 1, 0, 0.629, 3],
];

export const COACHES: SeedCoach[] = ROWS.map(([fullName, team, careerWins, careerLosses, superBowlWins, yearsWithTeam, recent3yrWinPct, playoffAppearances3yr]) => ({
  fullName, team, careerWins, careerLosses, superBowlWins, yearsWithTeam, recent3yrWinPct, playoffAppearances3yr,
}));
