/** The big number on a share card is 210px for a record like 17-0 or 162-0; a longer line ("Streak 24") shrinks to fit the column instead of wrapping into the footer. */
export function headlineSize(headline: string): number {
  const n = [...headline].length;
  return n <= 5 ? 210 : Math.max(56, Math.floor(600 / (n * 0.52)));
}
