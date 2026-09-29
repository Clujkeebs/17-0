import * as Sentry from '@sentry/nextjs';

/** Strip anything that could be PII before an event leaves the server. */
function scrub(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request) { delete event.request.cookies; delete event.request.data; if (event.request.headers) event.request.headers = {}; }
  if (event.user) event.user = { id: event.user.id };
  return event;
}

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.05, beforeSend: scrub });
}

export const onRequestError = Sentry.captureRequestError;
