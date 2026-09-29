import { sendEmail, dailyPuzzle, type SendOptions } from './email';

/** Worker-side dispatcher for the `newsletter` queue. Throwing lets BullMQ retry with backoff. */
export async function dispatchEmailJob(kind: string, data: Record<string, unknown>) {
  let opts: SendOptions;
  if (kind === 'send') {
    opts = data as unknown as SendOptions;
  } else if (kind === 'daily-puzzle') {
    const { to, date, teams, unsubscribeUrl } = data as { to: string; date: string; teams: string[]; unsubscribeUrl: string };
    opts = { to, ...dailyPuzzle(date, teams, unsubscribeUrl), marketing: true, unsubscribeUrl };
  } else {
    throw new Error(`Unknown email job: ${kind}`);
  }
  const r = await sendEmail(opts);
  if (!r.ok) throw new Error(r.error ?? 'send failed');
  return r;
}
