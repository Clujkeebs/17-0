// Privacy-first analytics. Events carry no PII. Sent with sendBeacon to our own endpoint.
export type AnalyticsEvent =
  | 'game_started' | 'game_completed' | 'game_shared' | 'challenge_created' | 'signup_started' | 'signup_completed'
  | 'newsletter_viewed' | 'newsletter_submitted' | 'newsletter_confirmed' | 'leaderboard_viewed' | 'ad_impression' | 'ad_click';

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ event, props, path: location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/events', body);
    else void fetch('/api/events', { method: 'POST', body, keepalive: true });
  } catch { /* never break the page for analytics */ }
}
