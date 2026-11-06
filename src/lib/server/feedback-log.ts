/**
 * The `[feedback]` log line the daily review reads. `user` is the signed-in account's username (a public handle, the
 * same one the leaderboards show), left out for guests; never an email or an address. `fromOwner` comes from the
 * session too and always sits just before `message`, so nothing typed in the message can pass for either.
 */
export function feedbackLogLine(f: { rating: number; page: string | null; signedIn: boolean; username?: string | null; fromOwner: boolean; message: string }): string {
  const user = f.signedIn && f.username ? { user: f.username } : {};
  return `[feedback] ${JSON.stringify({ rating: f.rating, page: f.page, signedIn: f.signedIn, ...user, ...(f.fromOwner ? { fromOwner: true } : {}), message: f.message })}`;
}
