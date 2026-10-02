const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;

/** The surname people use: "Patrick Surtain II" is Surtain, "Marvin Harrison Jr." is Harrison. */
export function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1] ?? full;
}
